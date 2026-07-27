from app.models import SustainabilityMetrics

def compute_sustainability(tokens_before: int, tokens_after: int) -> SustainabilityMetrics:
    tokens_saved = max(0, tokens_before - tokens_after)
    reduction_percent = round((tokens_saved / max(1, tokens_before)) * 100.0, 2)
    
    # Sustainability formulas specified in blueprint:
    # Energy Saved (Wh) = Tokens Saved * 0.0003
    # CO2 Reduced (g) = (Energy Saved in kWh) * 0.385  => (energy_wh / 1000) * 0.385
    # Water Saved (mL) = Energy Saved in Wh * 0.25
    energy_saved_wh = round(tokens_saved * 0.0003, 6)
    co2_reduced_g = round((energy_saved_wh / 1000.0) * 0.385, 6)
    water_saved_ml = round(energy_saved_wh * 0.25, 6)
    
    return SustainabilityMetrics(
        tokens_before=tokens_before,
        tokens_after=tokens_after,
        tokens_saved=tokens_saved,
        reduction_percent=reduction_percent,
        energy_saved_wh=energy_saved_wh,
        co2_reduced_g=co2_reduced_g,
        water_saved_ml=water_saved_ml,
    )
