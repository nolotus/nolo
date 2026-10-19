// @ts-nocheck
import React, { useState } from "react";
import { Map, ToolBarControl, Marker } from "@uiw/react-amap";

const GaodeMap = ({ lat = 31.86119, lng = 117.283042, title }: any) => {
  const [center, setCenter] = useState([lng, lat]);
  return (
    <Map style={{ height: 300 }} center={center as any}>
      <ToolBarControl position={"RB" as any} />
      <Marker
        title="北京市"
        label={{
          content: `<div class='info'>${title}</div>`,
          direction: "right",
        }}
        position={[Number(lng), Number(lat)] as any}
      />
    </Map>
  );
};
export default GaodeMap;
