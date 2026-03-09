using Microsoft.AspNetCore.Mvc;

namespace StandartDesk.Controllers;

/// <summary>
/// Health check endpoint for Docker and monitoring
/// </summary>
[ApiController]
[Route("")]
public class HealthController : ControllerBase
{
    /// <summary>
    /// Health check endpoint for Docker/Kubernetes liveness probe
    /// </summary>
    [HttpGet("health")]
    public ActionResult<HealthResponse> GetHealth()
    {
        return Ok(new HealthResponse
        {
            Status = "Healthy",
            Timestamp = DateTime.UtcNow,
            Version = "1.0.0"
        });
    }

    /// <summary>
    /// Ready check endpoint for Docker/Kubernetes readiness probe
    /// </summary>
    [HttpGet("ready")]
    public ActionResult<HealthResponse> GetReady()
    {
        return Ok(new HealthResponse
        {
            Status = "Ready",
            Timestamp = DateTime.UtcNow,
            Version = "1.0.0"
        });
    }
}

/// <summary>
/// Health check response model
/// </summary>
public class HealthResponse
{
    public string Status { get; set; } = "Unknown";
    public DateTime Timestamp { get; set; }
    public string Version { get; set; } = "1.0.0";
}
