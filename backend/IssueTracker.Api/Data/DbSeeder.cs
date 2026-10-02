using IssueTracker.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace IssueTracker.Api.Data;

public static class DbSeeder
{
    /// <summary>Adds a few sample issues when the table is empty (Development only).</summary>
    public static async Task SeedAsync(AppDbContext db, TimeProvider clock)
    {
        if (await db.Issues.AnyAsync())
        {
            return;
        }

        var now = clock.GetUtcNow();

        var resolved = new Issue
        {
            Title = "Fix typo on the welcome page",
            Description = "\"Welcom\" should be \"Welcome\".",
            CreatedAt = now.AddDays(-3),
            UpdatedAt = now.AddDays(-3)
        };
        resolved.Resolve(now.AddDays(-2));

        db.Issues.AddRange(
            resolved,
            new Issue
            {
                Title = "Login button not working",
                Description = "Clicking login does nothing on Safari.",
                CreatedAt = now.AddDays(-1),
                UpdatedAt = now.AddDays(-1)
            },
            new Issue
            {
                Title = "Add dark mode",
                Description = "Users have asked for a dark theme.",
                CreatedAt = now.AddHours(-2),
                UpdatedAt = now.AddHours(-2)
            });

        await db.SaveChangesAsync();
    }
}
