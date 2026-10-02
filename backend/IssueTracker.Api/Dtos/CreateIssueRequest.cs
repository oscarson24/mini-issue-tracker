using System.ComponentModel.DataAnnotations;

namespace IssueTracker.Api.Dtos;

public class CreateIssueRequest
{
    /// <summary>Short summary of the issue (1–200 characters).</summary>
    /// <example>Login button not working</example>
    [Required(AllowEmptyStrings = false)]
    [StringLength(200)]
    public string Title { get; set; } = string.Empty;

    /// <summary>Optional details (up to 2000 characters).</summary>
    /// <example>Clicking login does nothing on Safari.</example>
    [StringLength(2000)]
    public string? Description { get; set; }
}
