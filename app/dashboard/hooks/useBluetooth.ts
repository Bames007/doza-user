// hooks/useBluetooth.ts
import { useState, useCallback, useRef } from "react";

export const useBluetooth = () => {
  const [status, setStatus] = useState<
    "idle" | "scanning" | "pairing" | "complete"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [heartRate, setHeartRate] = useState<number | null>(null);

  // Use refs for the device and server to avoid re-render loops
  // and ensure cleanup has access to the latest instances.
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
    // Heart Rate Measurement is usually the 2nd byte in the DataView
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

      // 1. Request Device
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ["heart_rate"] }],
        optionalServices: ["battery_service"],
      });

      deviceRef.current = device;
      device.addEventListener("gattserverdisconnected", disconnect);

      setStatus("pairing");

      // 2. Connect to GATT Server
      const server = await device.gatt?.connect();
      if (!server) throw new Error("Could not establish GATT connection.");
      serverRef.current = server;

      // 3. Get Heart Rate Service & Characteristic
      const service = await server.getPrimaryService("heart_rate");
      const characteristic = await service.getCharacteristic(
        "heart_rate_measurement",
      );

      // 4. Start Notifications (The "Live" part)
      await characteristic.startNotifications();
      characteristic.addEventListener(
        "characteristicvaluechanged",
        handleCharacteristicValueChanged,
      );

      setStatus("complete");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      // Don't show error if user simply cancelled the picker
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
