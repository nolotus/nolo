import type { WeatherParam, WeatherQueryParams } from "./weatherTypes";
import { set } from "date-fns";
function getTodayAtFiveAM(): number {
  const now = new Date();
  const todayAtFiveAM = set(now, {
    hours: 5,
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
  });
  return todayAtFiveAM.getTime();
}
export const parseWeatherParams = ({
  lat,
  lng,
}: {
  lat: number;
  lng: number;
}): WeatherQueryParams => {
  return {
    lat,
    lng,
    start: getTodayAtFiveAM(),
    params: [
      "airTemperature",
      "pressure",
      "cloudCover",
      "currentDirection",
      "currentSpeed",
      "gust",
      "humidity",
      "precipitation",
      "seaLevel",
      "swellDirection",
      "swellHeight",
      "swellPeriod",
      "secondarySwellPeriod",
      "secondarySwellDirection",
      "secondarySwellHeight",
      "visibility",
      "waterTemperature",
      "waveDirection",
      "waveHeight",
      "wavePeriod",
      "windWaveDirection",
      "windWaveHeight",
      "windWavePeriod",
      "windDirection",
      "windSpeed",
    ] as WeatherParam[],
  };
};
