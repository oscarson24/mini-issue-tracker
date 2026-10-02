# Build context: ./backend

# Development: source is bind-mounted by docker-compose.override.yml and rebuilt by `dotnet watch`.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS dev
WORKDIR /src
ENV ASPNETCORE_HTTP_PORTS=8080 \
    DOTNET_USE_POLLING_FILE_WATCHER=true \
    DOTNET_WATCH_RESTART_ON_RUDE_EDIT=true \
    DOTNET_WATCH_SUPPRESS_LAUNCH_BROWSER=true
EXPOSE 8080
ENTRYPOINT ["dotnet", "watch", "--project", "IssueTracker.Api", "run", "--no-launch-profile"]

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore first so the package layer is cached until the csproj changes.
COPY IssueTracker.Api/IssueTracker.Api.csproj IssueTracker.Api/
RUN dotnet restore IssueTracker.Api/IssueTracker.Api.csproj

COPY IssueTracker.Api/ IssueTracker.Api/
RUN dotnet publish IssueTracker.Api/IssueTracker.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "IssueTracker.Api.dll"]
