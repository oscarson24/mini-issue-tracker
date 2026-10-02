using System.Reflection;
using System.Text.Json.Serialization;
using IssueTracker.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;

const string FrontendCorsPolicy = "Frontend";

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddControllers()
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddSingleton(TimeProvider.System);

builder.Services.AddDbContext<AppDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("Default");
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        throw new InvalidOperationException(
            "Connection string 'Default' is not configured. Set ConnectionStrings__Default " +
            "(environment variable) or use 'dotnet user-secrets set ConnectionStrings:Default ...'.");
    }

    options.UseSqlServer(connectionString, sql => sql.EnableRetryOnFailure());
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Mini Issue Tracker API",
        Version = "v1",
        Description = "List, create and resolve issues."
    });

    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    options.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory, xmlFile));
});

builder.Services.AddCors(options => options.AddPolicy(FrontendCorsPolicy, policy => policy
    .WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [])
    .AllowAnyHeader()
    .AllowAnyMethod()));

var app = builder.Build();

await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    // Tests swap in SQLite and create the schema themselves; migrations are SQL Server-specific.
    if (db.Database.IsSqlServer())
    {
        await db.Database.MigrateAsync();

        if (app.Environment.IsDevelopment())
        {
            await DbSeeder.SeedAsync(db, scope.ServiceProvider.GetRequiredService<TimeProvider>());
        }
    }
}

// Swagger is enabled in every environment because it is the project's API documentation.
app.UseSwagger();
app.UseSwaggerUI(options => options.DocumentTitle = "Mini Issue Tracker API");

app.UseCors(FrontendCorsPolicy);

app.MapControllers();

app.Run();

public partial class Program;
