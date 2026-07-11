// hooks/useBluetooth.ts
import { useState, useCallback, useRef } from "react";

export const useBluetooth = () => {
  const [status, setStatus] = useState<
    "idle" | "scanning" | "pairing" | "complete"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [heartRate, setHeartRate] = useState<number | null>(null);

  const deviceRef = useRef<BluetoothDevice | null>(null);
  const serverRef = useRef<BluetoothRemoteGATTServer | null>(null);

  const disconnect = useCallback(() => {
    if (serverRef.current?.connected) {
      serverRef.current.disconnect();
    }
    deviceRef.current = null;
    serverRef.current = null;
    setStatus("idle");
    setHeartRate(null);
  }, []);

  const handleCharacteristicValueChanged = (event: any) => {
    const value = event.target.value;
    const flags = value.getUint8(0);
    const rate = flags & 0x01 ? value.getUint16(1, true) : value.getUint8(1);
    setHeartRate(rate);
  };

  const scanAndConnect = useCallback(async () => {
    if (!navigator.bluetooth) {
      setError("Web Bluetooth is not supported in this browser.");
      return;
    }

    try {
      setError(null);
      setStatus("scanning");

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ["heart_rate"] }],
        optionalServices: ["battery_service"],
      });

      deviceRef.current = device;
      device.addEventListener("gattserverdisconnected", disconnect);

      setStatus("pairing");

      const server = await device.gatt?.connect();
      if (!server) throw new Error("Could not establish GATT connection.");
      serverRef.current = server;

      const service = await server.getPrimaryService("heart_rate");
      const characteristic = await service.getCharacteristic(
        "heart_rate_measurement",
      );

      await characteristic.startNotifications();
      characteristic.addEventListener(
        "characteristicvaluechanged",
        handleCharacteristicValueChanged,
      );

      setStatus("complete");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      // Do not log errors in production – avoid leaking device info.
      if (process.env.NODE_ENV !== "production") {
        console.error("Bluetooth connection error:", message);
      }
      if (message.includes("User cancelled")) {
        setStatus("idle");
      } else {
        setError(message);
        setStatus("idle");
      }
      disconnect();
    }
  }, [disconnect]);

  return { status, error, heartRate, scanAndConnect, disconnect };
};
