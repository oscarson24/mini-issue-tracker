using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using IssueTracker.Api.Dtos;
using IssueTracker.Api.Models;

namespace IssueTracker.Api.Tests;

public class IssuesApiTests : IDisposable
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    // xUnit creates a new instance per test, so every test gets its own empty database.
    private readonly IssueTrackerApiFactory _factory = new();
    private readonly HttpClient _client;

    public IssuesApiTests()
    {
        _client = _factory.CreateClient();
    }

    public void Dispose() => _factory.Dispose();

    private async Task<IssueResponse> CreateIssueAsync(string title, string? description = null)
    {
        var response = await _client.PostAsJsonAsync("/api/issues", new { title, description });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<IssueResponse>(Json))!;
    }

    private async Task<List<IssueResponse>> GetIssuesAsync(string query = "")
    {
        var issues = await _client.GetFromJsonAsync<List<IssueResponse>>($"/api/issues{query}", Json);
        return issues!;
    }

    [Fact]
    public async Task GetAll_WhenEmpty_ReturnsEmptyList()
    {
        Assert.Empty(await GetIssuesAsync());
    }

    [Fact]
    public async Task Create_ValidRequest_Returns201WithLocationAndOpenIssue()
    {
        var response = await _client.PostAsJsonAsync("/api/issues",
            new { title = "  Login button not working  ", description = "Safari only" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var issue = await response.Content.ReadFromJsonAsync<IssueResponse>(Json);
        Assert.NotNull(issue);
        Assert.Equal("Login button not working", issue.Title);
        Assert.Equal("Safari only", issue.Description);
        Assert.Equal(IssueStatus.Open, issue.Status);
        Assert.Null(issue.ResolvedAt);
        Assert.Equal(issue.CreatedAt, issue.UpdatedAt);
        Assert.Equal($"/api/issues/{issue.Id}", response.Headers.Location?.AbsolutePath);
    }

    [Fact]
    public async Task Create_SerializesStatusAsString()
    {
        var response = await _client.PostAsJsonAsync("/api/issues", new { title = "Check JSON" });

        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("\"status\":\"Open\"", body);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task Create_MissingTitle_Returns400(string? title)
    {
        var response = await _client.PostAsJsonAsync("/api/issues", new { title });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("Title", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Create_TooLongFields_Returns400()
    {
        var response = await _client.PostAsJsonAsync("/api/issues",
            new { title = new string('a', 201), description = new string('b', 2001) });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Title", body);
        Assert.Contains("Description", body);
    }

    [Fact]
    public async Task GetById_Existing_ReturnsIssue()
    {
        var created = await CreateIssueAsync("Find me");

        var issue = await _client.GetFromJsonAsync<IssueResponse>($"/api/issues/{created.Id}", Json);

        Assert.Equal(created, issue);
    }

    [Fact]
    public async Task GetById_Unknown_Returns404()
    {
        var response = await _client.GetAsync("/api/issues/999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetAll_ReturnsNewestFirst()
    {
        var first = await CreateIssueAsync("First");
        var second = await CreateIssueAsync("Second");

        var issues = await GetIssuesAsync();

        Assert.Equal([second.Id, first.Id], issues.Select(i => i.Id));
    }

    [Fact]
    public async Task Resolve_OpenIssue_SetsStatusAndResolvedAt()
    {
        var created = await CreateIssueAsync("Resolve me");

        var response = await _client.PatchAsync($"/api/issues/{created.Id}/resolve", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var issue = await response.Content.ReadFromJsonAsync<IssueResponse>(Json);
        Assert.NotNull(issue);
        Assert.Equal(IssueStatus.Resolved, issue.Status);
        Assert.NotNull(issue.ResolvedAt);
        Assert.True(issue.ResolvedAt > created.CreatedAt);
        Assert.Equal(issue.ResolvedAt, issue.UpdatedAt);
        Assert.Equal(created.CreatedAt, issue.CreatedAt);
    }

    [Fact]
    public async Task Resolve_AlreadyResolved_IsIdempotent()
    {
        var created = await CreateIssueAsync("Resolve twice");
        var firstResponse = await _client.PatchAsync($"/api/issues/{created.Id}/resolve", null);
        var first = await firstResponse.Content.ReadFromJsonAsync<IssueResponse>(Json);

        var secondResponse = await _client.PatchAsync($"/api/issues/{created.Id}/resolve", null);

        Assert.Equal(HttpStatusCode.OK, secondResponse.StatusCode);
        var second = await secondResponse.Content.ReadFromJsonAsync<IssueResponse>(Json);
        Assert.Equal(first, second);
    }

    [Fact]
    public async Task Resolve_Unknown_Returns404()
    {
        var response = await _client.PatchAsync("/api/issues/999/resolve", null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Theory]
    [InlineData("Open")]
    [InlineData("open")]
    [InlineData("Resolved")]
    public async Task GetAll_FilterByStatus_ReturnsOnlyMatchingIssues(string status)
    {
        var open = await CreateIssueAsync("Still open");
        var resolved = await CreateIssueAsync("Done");
        await _client.PatchAsync($"/api/issues/{resolved.Id}/resolve", null);

        var issues = await GetIssuesAsync($"?status={status}");

        var expected = Enum.Parse<IssueStatus>(status, ignoreCase: true) == IssueStatus.Open ? open : resolved;
        var issue = Assert.Single(issues);
        Assert.Equal(expected.Id, issue.Id);
    }

    [Theory]
    [InlineData("Closed")]
    [InlineData("5")]
    public async Task GetAll_InvalidStatus_Returns400(string status)
    {
        var response = await _client.GetAsync($"/api/issues?status={status}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Swagger_DocumentListsIssueEndpoints()
    {
        var response = await _client.GetAsync("/swagger/v1/swagger.json");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("/api/issues/{id}/resolve", body);
    }
}
