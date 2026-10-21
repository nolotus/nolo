// @ts-nocheck
import React from "react";
import GoogleMapReact from "google-map-react";

const googleMapsApiKey =
  process.env.GOOGLE_MAPS_API_KEY?.trim() || process.env.MAPS_API_KEY?.trim();

const AnyReactComponent = ({ text }: any) => <div>{text}</div>;

export default function GoogleMap({ lat, lng, title }: any) {
  const defaultProps = {
    center: {
      lat,
      lng,
    },
    zoom: 13,
  };

  return (
    // Important! Always set the container height explicitly
    <div style={{ height: "100%", width: "100%" }}>
      {googleMapsApiKey ? (
        <GoogleMapReact
          bootstrapURLKeys={{ key: googleMapsApiKey }}
          defaultCenter={defaultProps.center}
          defaultZoom={defaultProps.zoom}
        >
          <AnyReactComponent lat={lat} lng={lng} text={title} />
        </GoogleMapReact>
      ) : null}
    </div>
  );
}
