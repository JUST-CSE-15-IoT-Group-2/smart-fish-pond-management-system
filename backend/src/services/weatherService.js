const { fetchWeatherApi } = require('openmeteo');
const SystemSettings = require('../models/SystemSettings');
const MotorState = require('../models/MotorState');

const DEVICE_ID = 'pond-motor-01';
let intervalId = null;

function getWeatherDesc(code, rain) {
  if (rain > 0) {
    return `Raining (${rain} mm)`;
  }
  const codes = {
    0: "Clear Sky",
    1: "Mainly Clear", 
    2: "Partly Cloudy", 
    3: "Overcast",
    45: "Foggy", 
    48: "Depositing Rime Fog",
    51: "Light Drizzle", 
    53: "Moderate Drizzle", 
    55: "Dense Drizzle",
    56: "Light Freezing Drizzle", 
    57: "Dense Freezing Drizzle",
    61: "Slight Rain", 
    63: "Moderate Rain", 
    65: "Heavy Rain",
    66: "Light Freezing Rain", 
    67: "Heavy Freezing Rain",
    71: "Slight Snow Fall", 
    73: "Moderate Snow Fall", 
    75: "Heavy Snow Fall",
    77: "Snow Grains",
    80: "Slight Rain Showers", 
    81: "Moderate Rain Showers", 
    82: "Violent Rain Showers",
    85: "Slight Snow Showers", 
    86: "Heavy Snow Showers",
    95: "Thunderstorm", 
    96: "Thunderstorm with Slight Hail", 
    99: "Thunderstorm with Heavy Hail"
  };
  return codes[code] || `Unknown (${code})`;
}

async function checkWeatherAndControlMotor(io) {
  try {
    console.log('[WeatherService] Performing scheduled weather check...');
    // Retrieve system settings for coordinates
    const settings = await SystemSettings.findOne().sort({ updatedAt: -1 });
    
    const lat = settings && typeof settings.latitude === 'number' ? settings.latitude : 52.52;
    const lon = settings && typeof settings.longitude === 'number' ? settings.longitude : 13.41;

    console.log(`[WeatherService] Fetching weather for coordinates: Lat ${lat}, Lon ${lon}`);

    const url = "https://api.open-meteo.com/v1/forecast";
    const params = {
      latitude: lat,
      longitude: lon,
      current: ['temperature_2m', 'relative_humidity_2m', 'wind_speed_10m', 'rain', 'weather_code']
    };

    const responses = await fetchWeatherApi(url, params);
    if (!responses || responses.length === 0) {
      console.warn('[WeatherService] No response received from OpenMeteo API.');
      return;
    }

    const response = responses[0];
    const current = response.current();
    if (!current) {
      console.warn('[WeatherService] No current weather data available in response.');
      return;
    }

    // Extract weather variables
    const temp = current.variables(0) ? current.variables(0).value() : 0;
    const humidity = current.variables(1) ? current.variables(1).value() : 0;
    const windSpeed = current.variables(2) ? current.variables(2).value() : 0;
    const rainVal = current.variables(3) ? current.variables(3).value() : 0;
    const weatherCode = current.variables(4) ? current.variables(4).value() : 0;
    const elevation = response.elevation() || 0;

    const weatherStatus = getWeatherDesc(weatherCode, rainVal);

    // OpenMeteo rain weather codes
    const rainCodes = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];
    const isRaining = rainVal > 0 || rainCodes.includes(weatherCode);

    console.log(`[WeatherService] Weather results: rain=${rainVal}mm, weather_code=${weatherCode}, temp=${temp}°C, humidity=${humidity}%, isRaining=${isRaining}`);

    // Update settings cache in database
    if (settings) {
      await SystemSettings.findByIdAndUpdate(settings._id, {
        weatherTemp: Math.round(temp * 10) / 10,
        weatherHumidity: Math.round(humidity),
        weatherWindSpeed: Math.round(windSpeed * 10) / 10,
        weatherRain: Math.round(rainVal * 100) / 100,
        weatherCode: weatherCode,
        weatherStatus: weatherStatus,
        weatherTime: new Date(),
        weatherElevation: Math.round(elevation)
      });
    }

    // Broadcast weather update to frontend clients
    if (io) {
      io.emit('weather:update', {
        weatherTemp: Math.round(temp * 10) / 10,
        weatherHumidity: Math.round(humidity),
        weatherWindSpeed: Math.round(windSpeed * 10) / 10,
        weatherRain: Math.round(rainVal * 100) / 100,
        weatherCode: weatherCode,
        weatherStatus: weatherStatus,
        weatherTime: new Date(),
        weatherElevation: Math.round(elevation)
      });
    }

    // Update motor state based on weather
    const currentMotorState = await MotorState.findOne({ deviceId: DEVICE_ID });
    
    const autoMode = currentMotorState ? currentMotorState.autoMode : false;
    if (!autoMode) {
      console.log(`[WeatherService] Weather-based automatic control (autoMode) is disabled for ${DEVICE_ID}. Skipping motor auto-updates.`);
      return;
    }

    const currentlyEnabled = currentMotorState ? currentMotorState.enabled : false;

    if (isRaining && !currentlyEnabled) {
      console.log('[WeatherService] Rain detected. Turning motor ON.');
      const updated = await MotorState.findOneAndUpdate(
        { deviceId: DEVICE_ID },
        { enabled: true, speed: 100 },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      if (io) {
        io.emit('motor:update', {
          enabled: updated.enabled,
          connectionActive: updated.connectionActive,
          speed: updated.speed,
          autoMode: updated.autoMode,
        });
      }
    } else if (!isRaining && currentlyEnabled) {
      console.log('[WeatherService] Rain has stopped or is clear. Turning motor OFF.');
      const updated = await MotorState.findOneAndUpdate(
        { deviceId: DEVICE_ID },
        { enabled: false },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      if (io) {
        io.emit('motor:update', {
          enabled: updated.enabled,
          connectionActive: updated.connectionActive,
          speed: updated.speed,
          autoMode: updated.autoMode,
        });
      }
    } else {
      console.log(`[WeatherService] Motor status is already in sync with weather (CurrentlyEnabled: ${currentlyEnabled}, IsRaining: ${isRaining}). No action taken.`);
    }

  } catch (err) {
    console.error('[WeatherService] Error during weather check and motor control:', err.message);
  }
}

function initWeatherService(io) {
  if (intervalId) {
    clearInterval(intervalId);
  }

  // Run immediately on start
  checkWeatherAndControlMotor(io);

  // Set interval to check every 30 minutes (30 * 60 * 1000 ms)
  const INTERVAL_MS = 30 * 60 * 1000;
  intervalId = setInterval(() => {
    checkWeatherAndControlMotor(io);
  }, INTERVAL_MS);

  console.log('[WeatherService] Background weather service initialized successfully (30 min interval).');
}

module.exports = {
  initWeatherService,
  checkWeatherAndControlMotor
};
