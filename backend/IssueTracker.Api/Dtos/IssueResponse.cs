using IssueTracker.Api.Models;

namespace IssueTracker.Api.Dtos;

public record IssueResponse(
    int Id,
    string Title,
    string? Description,
    IssueStatus Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? ResolvedAt)
{
    public static IssueResponse FromEntity(Issue issue) => new(
        issue.Id,
        issue.Title,
        issue.Description,
        issue.Status,
        issue.CreatedAt,
        issue.UpdatedAt,
        issue.ResolvedAt);
}
