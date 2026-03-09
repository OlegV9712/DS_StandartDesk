# Multi-stage build for StandartDesk Backend
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build

WORKDIR /src

# Copy project file and restore dependencies
COPY ["StandartDesk.csproj", "."]
RUN dotnet restore "StandartDesk.csproj"

# Copy source code
COPY . .

# Build application
RUN dotnet build "StandartDesk.csproj" -c Release -o /app/build

# Publish application
FROM build AS publish
RUN dotnet publish "StandartDesk.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime

WORKDIR /app

# Install curl for health check
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy published application
COPY --from=publish /app/publish .

# Create logs directory
RUN mkdir -p /app/logs

# Set environment variables
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:80
ENV ASPNETCORE_HTTP_PORT=80

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

# Run application
ENTRYPOINT ["dotnet", "StandartDesk.dll"]
