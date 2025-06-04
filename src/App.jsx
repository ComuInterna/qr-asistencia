import React, { useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import * as XLSX from "xlsx";

const AttendanceApp = () => {
  const [scanner, setScanner] = useState(null);
  const [scannedData, setScannedData] = useState([]);
  const [isScanning, setIsScanning] = useState(false);

  const startScanner = () => {
    if (scanner) return;

    const qrScanner = new Html5QrcodeScanner("qr-reader", {
      fps: 10,
      qrbox: 250,
    });

    qrScanner.render(
      (decodedText) => {
        try {
          const data = JSON.parse(decodedText);
          const now = new Date();

          const isDuplicate = scannedData.some(
            (item) => item.numeroEmpleado === data.numeroEmpleado
          );

          if (isDuplicate) {
            alert("⚠️ Este número de empleado ya ha sido registrado.");
          } else {
            const record = {
              ...data,
              timestamp: now.toLocaleString(),
            };
            setScannedData((prev) => [...prev, record]);
          }
        } catch (error) {
          console.error("Error al interpretar el QR:", error);
        }
        qrScanner.clear();
        setScanner(null);
        setIsScanning(false);
      },
      (errorMessage) => {
        console.warn("QR Scan Error:", errorMessage);
      }
    );

    setScanner(qrScanner);
    setIsScanning(true);
  };

  const exportToExcel = () => {
    const formattedData = scannedData.map((item) => ({
      "Nombre completo": item.nombre,
      "Puesto": item.puesto,
      "Área": item.unidad,
      "Unidad de negocio": item.udn,
      "Número de empleado": item.numeroEmpleado,
      "Fecha y hora de registro": item.timestamp,
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Asistencia");
    XLSX.writeFile(workbook, "asistencia.xlsx");
  };

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: "auto", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>Registro de Asistencia Riverline Ergonomic</h1>
      <button onClick={startScanner} disabled={isScanning} style={{ marginRight: 12, padding: "8px 16px" }}>
        {isScanning ? "Escaneando..." : "Iniciar Escáner"}
      </button>
      <button onClick={exportToExcel} style={{ padding: "8px 16px" }}>
        Descargar Excel
      </button>

      <div id="qr-reader" style={{ marginTop: 20, marginBottom: 20 }} />

      <div style={{ border: "1px solid #4CAF50", borderRadius: 8, backgroundColor: "#69d766", padding: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: "600", marginBottom: 12 }}>Registros</h2>
        <ul style={{ listStyle: "none", paddingLeft: 0 }}>
          {scannedData.map((data, index) => (
            <li
              key={index}
              style={{
                border: "1px solid #81C784",
                borderRadius: 6,
                padding: 12,
                marginBottom: 12,
                color: "#2E7D32",
                backgroundColor: "#C8E6C9",
              }}
            >
              <p>✅ <strong>Registro exitoso</strong></p>
              <p><strong>Nombre:</strong> {data.nombre}</p>
              <p><strong>Puesto:</strong> {data.puesto}</p>
              <p><strong>Área:</strong> {data.unidad}</p>
              <p><strong>Unidad de negocio:</strong> {data.udn}</p>
              <p><strong>Número de empleado:</strong> {data.numeroEmpleado}</p>
              <p><strong>Fecha y hora:</strong> {data.timestamp}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AttendanceApp;
