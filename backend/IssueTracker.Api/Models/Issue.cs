namespace IssueTracker.Api.Models;

public class Issue
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public IssueStatus Status { get; set; } = IssueStatus.Open;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? ResolvedAt { get; set; }

    public void Resolve(DateTimeOffset now)
    {
        if (Status == IssueStatus.Resolved)
        {
            return;
        }

        Status = IssueStatus.Resolved;
        ResolvedAt = now;
        UpdatedAt = now;
    }
}
