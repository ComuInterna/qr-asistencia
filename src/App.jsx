import React, { useState, useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import * as XLSX from "xlsx";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
} from "firebase/firestore";

const AttendanceApp = () => {
  const [scanner, setScanner] = useState(null);
  const [scannedData, setScannedData] = useState([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const snapshot = await getDocs(collection(db, "asistencias"));
        const dataList = snapshot.docs.map((doc) => doc.data());
        setScannedData(dataList);
      } catch (error) {
        console.error("Error al cargar datos desde Firestore:", error);
      }
    };
    fetchData();
  }, []);

  const startScanner = () => {
    if (scanner) return;

    const qrScanner = new Html5QrcodeScanner("qr-reader", {
      fps: 10,
      qrbox: 250,
    });

    qrScanner.render(
      async (decodedText) => {
        qrScanner.clear();
        setScanner(null);
        setIsScanning(false);

        try {
          const data = JSON.parse(decodedText);
          const now = new Date();

          const q = query(
            collection(db, "asistencias"),
            where("numeroEmpleado", "==", data.numeroEmpleado)
          );
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            alert("⚠️ Este número de empleado ya ha sido registrado.");
            return;
          }

          const record = {
            ...data,
            timestamp: now.toLocaleString(),
          };

          await addDoc(collection(db, "asistencias"), record);
          setScannedData((prev) => [...prev, record]);
        } catch (error) {
          console.error("Error durante escaneo o guardado:", error);
          alert("Ocurrió un problema al procesar el QR.");
        }
      },
      (errorMessage) => {
        console.warn("Error de escaneo:", errorMessage);
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

  const clearLocalData = async () => {
    const confirmDelete = window.confirm(
      "¿Estás seguro de que quieres borrar todos los registros? Esta acción no se puede deshacer."
    );
    if (!confirmDelete) return;

    try {
      const snapshot = await getDocs(collection(db, "asistencias"));
      const deletePromises = snapshot.docs.map((docu) =>
        deleteDoc(doc(db, "asistencias", docu.id))
      );

      await Promise.all(deletePromises);
      setScannedData([]);
      alert("✅ Todos los registros fueron eliminados correctamente.");
    } catch (error) {
      console.error("❌ Error al borrar registros:", error);
      alert("Hubo un problema al borrar los registros.");
    }
  };

  return (
    <div
      style={{
        padding: 24,
        maxWidth: 600,
        margin: "auto",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>
        Registro de Asistencia Riverline Ergonomic
      </h1>

      <button
        onClick={startScanner}
        disabled={isScanning}
        style={{ marginRight: 12, padding: "8px 16px" }}
      >
        {isScanning ? "Escaneando..." : "Iniciar Escáner"}
      </button>

      <button onClick={exportToExcel} style={{ padding: "8px 16px" }}>
        Descargar Excel
      </button>

      <button
        onClick={clearLocalData}
        style={{
          marginLeft: 12,
          backgroundColor: "#f44336",
          color: "#fff",
          padding: "8px 16px",
          border: "none",
          borderRadius: 4,
        }}
      >
        Limpiar registros
      </button>

      <div id="qr-reader" style={{ marginTop: 20, marginBottom: 20 }} />

      <div
        style={{
          border: "1px solid #4CAF50",
          borderRadius: 8,
          backgroundColor: "#69d766",
          padding: 16,
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: "600", marginBottom: 12 }}>
          Registros
        </h2>
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
                backgroundColor: "#E8F5E9",
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
