using System.Security.Cryptography;
using System.Text.Json;
using HemodinksAPI.Application.Authentication;
using HemodinksAPI.Application.Services;
using HemodinksAPI.Domain.Models;
using HemodinksAPI.Infrastructure.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

internal static class IntegrationMain
{
    public static async Task Main()
    {
        var connection = new SqlConnectionStringBuilder(Environment.GetEnvironmentVariable("HEMODINKS_SYNTHETIC_SQL")
            ?? throw new InvalidOperationException("Use npm run test:e2e:real; no database fallback."));
        if (!connection.DataSource.StartsWith("127.0.0.1,", StringComparison.Ordinal)
            || !System.Text.RegularExpressions.Regex.IsMatch(connection.InitialCatalog, "^HemodinksWebE2E_[a-f0-9]{32}$"))
            throw new InvalidOperationException("Only a disposable loopback SQL database is allowed.");
        var output = Environment.GetEnvironmentVariable("HEMODINKS_REAL_FIXTURE")
            ?? throw new InvalidOperationException("Missing fixture destination.");
        using var factory = new SyntheticApiFactory(connection.ConnectionString);
        factory.UseKestrel(5193);
        using var client = factory.CreateClient();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PlatformDbContext>();
        var resolvedConnection = new SqlConnectionStringBuilder(db.Database.GetConnectionString());
        if (resolvedConnection.DataSource != connection.DataSource || resolvedConnection.InitialCatalog != connection.InitialCatalog)
            throw new InvalidOperationException("API database registration diverged from the owned SQL container.");
        // New catalog only, never migrate, reset or delete an existing database.
        if (!await db.Database.EnsureCreatedAsync()) throw new InvalidOperationException("Database must be new.");
        var password = "Synthetic@" + Convert.ToHexString(RandomNumberGenerator.GetBytes(12));
        var fixture = await SyntheticSeed.Create(db, password);
        await File.WriteAllTextAsync(output, JsonSerializer.Serialize(fixture, new JsonSerializerOptions(JsonSerializerDefaults.Web)));
        Console.WriteLine("SYNTHETIC_API_READY");
        await Console.In.ReadLineAsync();
    }
}

internal sealed class SyntheticApiFactory : WebApplicationFactory<Program>
{
    private readonly Dictionary<string, string?> settings;

    internal SyntheticApiFactory(string connection)
    {
        settings = new Dictionary<string, string?>
        {
            ["ConnectionStrings:DefaultConnection"] = connection,
            ["JwtSettings:SecretKey"] = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)),
            ["JwtSettings:Issuer"] = "SyntheticWebE2E",
            ["JwtSettings:Audience"] = "SyntheticWebE2E",
            ["JwtSettings:ExpirationMinutes"] = "30",
            ["Cors:AllowedOrigins:0"] = "http://127.0.0.1:5194",
            ["Database:RunMigrationsOnStartup"] = "false",
            ["Database:RunMaintenanceOnStartup"] = "false",
            ["Database:SchemaManagedByDeployment"] = "true",
            ["Seed:CbhpmOnStartup"] = "false",
            ["Seed:UsersOnStartup"] = "false",
            ["LocalStorage:RootPath"] = Environment.GetEnvironmentVariable("HEMODINKS_SYNTHETIC_STORAGE")
                ?? throw new InvalidOperationException("Missing owned storage directory."),
            ["Logging:LogLevel:Default"] = "Warning"
        };
        // Minimal hosting captures connection/JWT settings before WAF configuration callbacks.
        // Set these first so the application's user-secrets fallback cannot supply another database/key.
        foreach (var (key, value) in settings) Environment.SetEnvironmentVariable(key.Replace(":", "__"), value);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseContentRoot(Environment.GetEnvironmentVariable("HEMODINKS_SYNTHETIC_STORAGE")!);
        builder.ConfigureAppConfiguration((_, config) =>
        {
            // Do not inherit application secrets, remote queues, storage or telemetry.
            config.Sources.Clear();
            config.AddInMemoryCollection(settings);
        });
        builder.ConfigureServices(services =>
        {
            foreach (var service in services.Where(s => s.ServiceType == typeof(IHostedService)).ToArray())
                services.Remove(service);
            services.AddScoped<IPasswordResetNotificationSender, DisabledPasswordResetSender>();
        });
    }

    private sealed class DisabledPasswordResetSender : IPasswordResetNotificationSender
    {
        public Task<PasswordResetNotificationDispatchStatus> SendAsync(PasswordResetNotification notification, CancellationToken cancellationToken)
            => throw new InvalidOperationException("External notification disabled in synthetic E2E.");
    }
}
