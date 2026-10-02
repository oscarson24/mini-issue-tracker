using IssueTracker.Api.Data;
using IssueTracker.Api.Dtos;
using IssueTracker.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IssueTracker.Api.Controllers;

[ApiController]
[Route("api/issues")]
[Produces("application/json")]
public class IssuesController(AppDbContext db, TimeProvider clock) : ControllerBase
{
    /// <summary>Lists issues, newest first.</summary>
    /// <param name="status">Optional filter: <c>Open</c> or <c>Resolved</c>.</param>
    /// <param name="cancellationToken">Request cancellation token.</param>
    [HttpGet]
    [ProducesResponseType<IEnumerable<IssueResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IEnumerable<IssueResponse>>> GetAll(
        [FromQuery] IssueStatus? status,
        CancellationToken cancellationToken)
    {
        // Invalid values (?status=Closed, ?status=5) are rejected by model binding with a 400 before this runs.
        var query = db.Issues.AsNoTracking();
        if (status is not null)
        {
            query = query.Where(i => i.Status == status);
        }

        var issues = await query
            .OrderByDescending(i => i.CreatedAt)
            .ThenByDescending(i => i.Id)
            .ToListAsync(cancellationToken);

        return Ok(issues.Select(IssueResponse.FromEntity));
    }

    /// <summary>Gets a single issue by id.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType<IssueResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IssueResponse>> GetById(int id, CancellationToken cancellationToken)
    {
        var issue = await db.Issues.AsNoTracking().FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
        return issue is null ? NotFound() : Ok(IssueResponse.FromEntity(issue));
    }

    /// <summary>Creates a new issue with status <c>Open</c>.</summary>
    [HttpPost]
    [Consumes("application/json")]
    [ProducesResponseType<IssueResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IssueResponse>> Create(
        CreateIssueRequest request,
        CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var description = request.Description?.Trim();
        var issue = new Issue
        {
            Title = request.Title.Trim(),
            Description = string.IsNullOrEmpty(description) ? null : description,
            Status = IssueStatus.Open,
            CreatedAt = now,
            UpdatedAt = now
        };

        db.Issues.Add(issue);
        await db.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = issue.Id }, IssueResponse.FromEntity(issue));
    }

    /// <summary>Marks an issue as resolved. Resolving an already resolved issue is a no-op.</summary>
    [HttpPatch("{id:int}/resolve")]
    [ProducesResponseType<IssueResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IssueResponse>> Resolve(int id, CancellationToken cancellationToken)
    {
        var issue = await db.Issues.FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
        if (issue is null)
        {
            return NotFound();
        }

        issue.Resolve(clock.GetUtcNow());
        await db.SaveChangesAsync(cancellationToken);

        return Ok(IssueResponse.FromEntity(issue));
    }
}
