using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.HostFiltering;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using System.Security.Cryptography;
using System.Text;
using StandartDesk.Data;
using StandartDesk.Hubs;
using StandartDesk.Models;
using StandartDesk.Services;
using AspNetCoreRateLimit;

var builder = WebApplication.CreateBuilder(args);

// Configure allowed hosts - critical for Docker/reverse proxy
builder.Services.Configure<HostFilteringOptions>(options =>
{
    options.AllowedHosts.Clear();
    options.AllowedHosts.Add("*");
});

// Logging with Serilog
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .Enrich.FromLogContext()
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
    .WriteTo.File("logs/standart-desk-.txt", 
        rollingInterval: RollingInterval.Day,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj}{NewLine}{Exception}")
    .CreateLogger();

builder.Host.UseSerilog();

// Add services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Database Configuration - Support both SQLite and PostgreSQL
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
var dbProvider = builder.Configuration["Database:Provider"] ?? "sqlite";

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    if (dbProvider.Equals("postgresql", StringComparison.OrdinalIgnoreCase))
    {
        options.UseNpgsql(connectionString ?? "Host=localhost;Database=standart_desk;Username=postgres;Password=password");
        Log.Information("📊 Using PostgreSQL database");
    }
    else
    {
        options.UseSqlite(connectionString ?? "Data Source=standart-desk.db");
        Log.Information("📊 Using SQLite database");
    }
    // Suppress pending model changes warning - we'll handle via migrations
    options.ConfigureWarnings(w =>
        w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
});

// Security Services
builder.Services.AddScoped<ISecurityService, SecurityService>();

// Business Services
builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddScoped<IVersioningService, VersioningService>();
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<ChatbotService>();

// SignalR
builder.Services.AddSignalR();

// Rate Limiting
builder.Services.AddMemoryCache();
builder.Services.Configure<IpRateLimitOptions>(builder.Configuration.GetSection("IpRateLimiting"));
builder.Services.Configure<IpRateLimitPolicies>(builder.Configuration.GetSection("IpRateLimitPolicies"));
builder.Services.AddInMemoryRateLimiting();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();

// CORS - Restricted and secure
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? new[]
        {
            "http://localhost:5173",
            "https://localhost:5173",
            "http://localhost:3000",
            "https://localhost:3000"
        };

        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials()
            .WithExposedHeaders("Content-Disposition");
    });
});

// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrEmpty(jwtKey) || jwtKey.Contains("change-in-production"))
{
    Log.Fatal("⚠️  JWT Key not configured securely. Set Jwt:Key in appsettings.json with a strong key.");
    throw new InvalidOperationException("JWT Key must be configured securely");
}

var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "StandartDesk";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "StandartDeskUsers";
var jwtExpireDays = int.TryParse(builder.Configuration["Jwt:ExpireDays"], out var days) ? days : 7;

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ClockSkew = TimeSpan.Zero
    };
    options.Events = new JwtBearerEvents
    {
        OnAuthenticationFailed = context =>
        {
            Log.Warning("JWT authentication failed: {Message}", context.Exception?.Message);
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

var app = builder.Build();

// Apply migrations
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var securityService = scope.ServiceProvider.GetRequiredService<ISecurityService>();
    
    db.Database.Migrate();
    Log.Information("✅ Database migrations applied");

    // Seed default admin user if not exists
    if (!db.Users.Any(u => u.Username == "admin"))
    {
        var adminUser = new User
        {
            Username = "admin",
            Email = "admin@standartdesk.local",
            FullName = "Administrator",
            PasswordHash = securityService.HashPassword("9712admin9712!"),
            Role = UserRole.Admin,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        db.Users.Add(adminUser);
        db.SaveChanges();
        Log.Information("✅ Admin user 'admin' created with configured password");
    }
}

// Configure middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Support Nginx reverse proxy - allow forwarded hosts
var forwardedHeadersOptions = new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost
};
forwardedHeadersOptions.KnownNetworks.Clear();
forwardedHeadersOptions.KnownProxies.Clear();
forwardedHeadersOptions.AllowedHosts.Add("*");
app.UseForwardedHeaders(forwardedHeadersOptions);

// Override host validation for health endpoint
app.Use((context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/health") || context.Request.Path.StartsWithSegments("/ready"))
    {
        context.Request.Host = new Microsoft.AspNetCore.Http.HostString("localhost");
    }
    return next();
});

// CORS MUST be first (before other middleware)
app.UseCors("AllowFrontend");

// Security Headers
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["X-XSS-Protection"] = "1; mode=block";
    context.Response.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
    context.Response.Headers["Content-Security-Policy"] = "default-src 'self'; connect-src 'self' ws: wss:;";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    await next();
});

// Rate Limiting
app.UseIpRateLimiting();

// Only redirect to HTTPS in production
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();

// Map hubs
app.MapHub<ProjectHub>("/hubs/project");

// Map controllers
app.MapControllers();

// Apply database migrations automatically on startup
try
{
    using (var scope = app.Services.CreateScope())
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Log.Information("🔄 Applying database migrations...");
        dbContext.Database.Migrate();
        Log.Information("✅ Database migrations completed successfully");
    }
}
catch (Exception ex)
{
    Log.Error(ex, "❌ Error applying database migrations");
    throw;
}

app.Run();
