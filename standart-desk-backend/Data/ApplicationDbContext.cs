using Microsoft.EntityFrameworkCore;
using StandartDesk.Models;

namespace StandartDesk.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Folder> Folders { get; set; } = null!;
    public DbSet<Project> Projects { get; set; } = null!;
    public DbSet<Page> Pages { get; set; } = null!;
    public DbSet<BlockSchema> BlockSchemas { get; set; } = null!;
    public DbSet<BlockSchemaVersion> BlockSchemaVersions { get; set; } = null!;
    public DbSet<TaskItem> Tasks { get; set; } = null!;
    public DbSet<TaskComment> TaskComments { get; set; } = null!;
    public DbSet<Comment> Comments { get; set; } = null!;
    public DbSet<AuditLog> AuditLogs { get; set; } = null!;
    public DbSet<Notification> Notifications { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User Configuration
        modelBuilder.Entity<User>()
            .HasKey(u => u.Id);
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique();
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        // Folder Configuration
        modelBuilder.Entity<Folder>()
            .HasKey(f => f.Id);
        modelBuilder.Entity<Folder>()
            .HasOne(f => f.Owner)
            .WithMany()
            .HasForeignKey(f => f.OwnerId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Folder>()
            .HasOne(f => f.ParentFolder)
            .WithMany(f => f.SubFolders)
            .HasForeignKey(f => f.ParentFolderId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Folder>()
            .HasMany(f => f.Projects)
            .WithOne(p => p.Folder)
            .HasForeignKey(p => p.FolderId)
            .OnDelete(DeleteBehavior.SetNull);

        // Project Configuration
        modelBuilder.Entity<Project>()
            .HasKey(p => p.Id);
        modelBuilder.Entity<Project>()
            .HasOne(p => p.Owner)
            .WithMany(u => u.Projects)
            .HasForeignKey(p => p.OwnerId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Project>()
            .HasMany(p => p.Pages)
            .WithOne(pg => pg.Project)
            .HasForeignKey(pg => pg.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Project>()
            .HasMany(p => p.BlockSchemas)
            .WithOne(bs => bs.Project)
            .HasForeignKey(bs => bs.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        // Page Configuration
        modelBuilder.Entity<Page>()
            .HasKey(p => p.Id);
        modelBuilder.Entity<Page>()
            .HasMany(p => p.BlockSchemas)
            .WithOne(bs => bs.Page)
            .HasForeignKey(bs => bs.PageId)
            .OnDelete(DeleteBehavior.Cascade);

        // BlockSchema Configuration
        modelBuilder.Entity<BlockSchema>()
            .HasKey(bs => bs.Id);
        modelBuilder.Entity<BlockSchema>()
            .HasMany(bs => bs.Versions)
            .WithOne(bsv => bsv.BlockSchema)
            .HasForeignKey(bsv => bsv.BlockSchemaId)
            .OnDelete(DeleteBehavior.Cascade);

        // BlockSchemaVersion Configuration
        modelBuilder.Entity<BlockSchemaVersion>()
            .HasKey(bsv => bsv.Id);
        modelBuilder.Entity<BlockSchemaVersion>()
            .HasOne(bsv => bsv.CreatedByUser)
            .WithMany()
            .HasForeignKey(bsv => bsv.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        // AuditLog Configuration
        modelBuilder.Entity<AuditLog>()
            .HasKey(al => al.Id);
        modelBuilder.Entity<AuditLog>()
            .HasOne(al => al.User)
            .WithMany(u => u.AuditLogs)
            .HasForeignKey(al => al.UserId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<AuditLog>()
            .HasOne(al => al.Project)
            .WithMany(p => p.AuditLogs)
            .HasForeignKey(al => al.ProjectId)
            .OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<AuditLog>()
            .HasOne(al => al.Page)
            .WithMany(p => p.AuditLogs)
            .HasForeignKey(al => al.PageId)
            .OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<AuditLog>()
            .HasOne(al => al.BlockSchema)
            .WithMany(bs => bs.AuditLogs)
            .HasForeignKey(al => al.BlockSchemaId)
            .OnDelete(DeleteBehavior.SetNull);

        // Task Configuration
        modelBuilder.Entity<TaskItem>()
            .HasKey(t => t.Id);
        modelBuilder.Entity<TaskItem>()
            .HasOne(t => t.Project)
            .WithMany(p => p.Tasks)
            .HasForeignKey(t => t.ProjectId)
            .OnDelete(DeleteBehavior.SetNull); // Allow null ProjectId for global tasks
        modelBuilder.Entity<TaskItem>()
            .HasOne(t => t.AssignedToUser)
            .WithMany()
            .HasForeignKey(t => t.AssignedToUserId)
            .OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<TaskItem>()
            .HasOne(t => t.CreatedByUser)
            .WithMany()
            .HasForeignKey(t => t.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        // TaskComment Configuration
        modelBuilder.Entity<TaskComment>()
            .HasKey(tc => tc.Id);
        modelBuilder.Entity<TaskComment>()
            .HasOne(tc => tc.Task)
            .WithMany(t => t.Comments)
            .HasForeignKey(tc => tc.TaskId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<TaskComment>()
            .HasOne(tc => tc.User)
            .WithMany()
            .HasForeignKey(tc => tc.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // Indexes
        modelBuilder.Entity<AuditLog>()
            .HasIndex(al => al.UserId);
        modelBuilder.Entity<AuditLog>()
            .HasIndex(al => al.CreatedAt);
        modelBuilder.Entity<BlockSchemaVersion>()
            .HasIndex(bsv => new { bsv.BlockSchemaId, bsv.VersionNumber });

        // Notification Configuration
        modelBuilder.Entity<Notification>()
            .HasKey(n => n.Id);
        modelBuilder.Entity<Notification>()
            .HasOne(n => n.User)
            .WithMany(u => u.Notifications)
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Notification>()
            .HasOne(n => n.Task)
            .WithMany(t => t.Notifications)
            .HasForeignKey(n => n.TaskId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Notification>()
            .HasOne(n => n.FromUser)
            .WithMany()
            .HasForeignKey(n => n.FromUserId)
            .OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Notification>()
            .HasIndex(n => new { n.UserId, n.IsRead, n.CreatedAt })
            .IsDescending(false, true, true);

        // Comment Configuration
        modelBuilder.Entity<Comment>()
            .HasKey(c => c.Id);
        modelBuilder.Entity<Comment>()
            .HasOne(c => c.Task)
            .WithMany(t => t.TaskComments)
            .HasForeignKey(c => c.TaskId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Comment>()
            .HasOne(c => c.User)
            .WithMany(u => u.Comments)
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Comment>()
            .HasIndex(c => new { c.TaskId, c.CreatedAt })
            .IsDescending(false, true);
    }
}
