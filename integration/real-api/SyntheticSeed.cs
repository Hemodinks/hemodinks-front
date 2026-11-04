using HemodinksAPI.Application.Authentication;
using HemodinksAPI.Domain.Models;
using HemodinksAPI.Infrastructure.Data;
using HemodinksAPI.Infrastructure.Utils;

internal static class SyntheticSeed
{
    internal static async Task<object> Create(PlatformDbContext db, string password)
    {
        var a = new Clinica { Nome = "Sintetica Alfa", Slug = "synthetic-alfa", Ativa = true };
        var b = new Clinica { Nome = "Sintetica Beta", Slug = "synthetic-beta", Ativa = true };
        db.AddRange(a, b);
        await db.SaveChangesAsync();
        var hasher = new PasswordHasher();
        User User(Clinica clinic, string email, int profile) => new() {
            ClinicaId = clinic.Id, Nome = email.Split('@')[0], Email = email,
            Telefone = "+551199999" + Random.Shared.Next(10000, 99999), Senha = hasher.HashPassword(password),
            PerfilId = profile, Ativo = true, PrecisaTrocarSenha = false
        };
        var multiA = User(a, "multi@example.invalid", Perfil.SuperAdministradorId);
        var multiB = User(b, "multi@example.invalid", Perfil.SuperAdministradorId);
        var singleA = User(a, "single-a@example.invalid", Perfil.AdministradorId);
        var singleB = User(b, "single-b@example.invalid", Perfil.AdministradorId);
        db.AddRange(multiA, multiB, singleA, singleB);
        await db.SaveChangesAsync();
        foreach (var user in new[] { multiA, multiB, singleA, singleB })
            await GlobalIdentityService.EnsureForUserAsync(db, user, CancellationToken.None);

        async Task<object> Resources(Clinica clinic, User admin, string suffix)
        {
            var patientUser = User(clinic, $"patient-{suffix}@example.invalid", Perfil.PacientesId);
            var patient = new Paciente { ClinicaId = clinic.Id, User = patientUser,
                NomePaciente = $"Paciente Sintetico {suffix}", MedicoUserId = admin.Id, Medico = admin.Nome,
                Data = DateTime.UtcNow, DataAtendimento = DateTime.UtcNow, Procedimento = "Procedimento sintetico" };
            var teamUser = User(clinic, $"team-{suffix}@example.invalid", Perfil.EquipeId);
            var team = new Equipe { ClinicaId = clinic.Id, Nome = $"Equipe Sintetica {suffix}", UsuarioLogin = teamUser, ModoIdentificacao = "Nenhuma" };
            var billing = new FaturamentoMedico { ClinicaId = clinic.Id, Paciente = patient, Observacoes = $"FATURAMENTO-SINTETICO-{suffix}" };
            var agenda = new Event { ClinicaId = clinic.Id, UserId = admin.Id, Title = $"AGENDA-SINTETICA-{suffix}", Start = DateTime.UtcNow.AddHours(1), End = DateTime.UtcNow.AddHours(2) };
            db.AddRange(patientUser, patient, teamUser, team, billing, agenda);
            await db.SaveChangesAsync();
            return new { clinic.Id, clinic.Slug, clinic.Nome, patientId = patient.Id, patientName = patient.NomePaciente,
                teamId = team.Id, teamName = team.Nome, eventId = agenda.Id, eventName = agenda.Title };
        }
        return new { apiUrl = "http://127.0.0.1:5193", password, multiEmail = multiA.Email, singleAEmail = singleA.Email,
            singleBEmail = singleB.Email, a = await Resources(a, singleA, "Alfa"), b = await Resources(b, singleB, "Beta") };
    }
}
