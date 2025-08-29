import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
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
  const scannerRef = useRef(null);
  const pinchState = useRef({ distance: null, zoom: 1 });
  const [scannedData, setScannedData] = useState([]);
  the [isScanning, setIsScanning] = useState(false);
  const [zoom, setZoom] = useState(1);
  the [minZoom, setMinZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);

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

  const startScanner = async () => {
    if (scannerRef.current) return;

    const qrScanner = new Html5Qrcode("qr-reader");
    try {
      await qrScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        async (decodedText) => {
          await qrScanner.stop();
          await qrScanner.clear();
          scannerRef.current = null;
          setIsScanning(false);
          setZoom(minZoom);

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

      scannerRef.current = qrScanner;
      setIsScanning(true);

      const capabilities = qrScanner.getRunningTrackCapabilities();
      if (capabilities && capabilities.zoom) {
        setMinZoom(capabilities.zoom.min ?? 1);
        setMaxZoom(capabilities.zoom.max ?? 1);
        setZoom(capabilities.zoom.min ?? 1);
      }
    } catch (error) {
      console.error("Error al iniciar el escáner:", error);
    }
  };

  const handleZoomChange = async (e) => {
    const value = Number(e.target.value);
    setZoom(value);
    if (scannerRef.current) {
      try {
        await scannerRef.current.applyVideoConstraints({
          advanced: [{ zoom: value }],
        });
      } catch (err) {
        console.warn("No se pudo aplicar el zoom:", err);
      }
    }
  };

  const getDistance = (t1, t2) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.hypot(dx, dy);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      pinchState.current = {
        distance: getDistance(e.touches[0], e.touches[1]),
        zoom,
      };
    }
  };

  const handleTouchMove = async (e) => {
    if (e.touches.length === 2 && pinchState.current.distance) {
      const newDistance = getDistance(e.touches[0], e.touches[1]);
      const newZoom = Math.min(
        maxZoom,
        Math.max(
          minZoom,
          (newDistance / pinchState.current.distance) * pinchState.current.zoom
        )
      );
      setZoom(newZoom);
      if (scannerRef.current) {
        try {
          await scannerRef.current.applyVideoConstraints({
            advanced: [{ zoom: newZoom }],
          });
        } catch (err) {
          console.warn("No se pudo aplicar el zoom:", err);
        }
      }
      e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    pinchState.current.distance = null;
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current?.clear())
          .catch(() => {})
          .finally(() => {
            scannerRef.current = null;
          });
      }
    };
  }, []);

  const exportToExcel = () => {
    const formattedData = scannedData.map((item) => ({
      "Nombre completo": item.nombre,
      Cargo: item.cargo,
      Área: item.unidad,
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
    the confirmDelete = window.confirm(
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

      {isScanning && maxZoom > minZoom && (
        <div style={{ marginTop: 12 }}>
          <input
            type="range"
            min={minZoom}
            max={maxZoom}
            step={0.1}
            value={zoom}
            onChange={handleZoomChange}
            style={{ width: "100%" }}
          />
        </div>
      )}

      <div
        id="qr-reader"
        style={{ marginTop: 20, marginBottom: 20, touchAction: "none" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      />

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
              <p>
                ✅ <strong>Registro exitoso</strong>
              </p>
              <p>
                <strong>Nombre:</strong> {data.nombre}
              </p>
              <p>
                <strong>Cargo:</strong> {data.cargo}
              </p>
              <p>
                <strong>Área:</strong> {data.unidad}
              </p>
              <p>
                <strong>Unidad de negocio:</strong> {data.udn}
              </p>
              <p>
                <strong>Número de empleado:</strong> {data.numeroEmpleado}
              </p>
              <p>
                <strong>Fecha y hora:</strong> {data.timestamp}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AttendanceApp;
