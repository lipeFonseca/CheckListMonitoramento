import React, { useMemo, useRef, useState, useEffect } from "react";
import { Camera, ChevronDown, ChevronUp, FileDown, ImagePlus, Plus, Save, Server, Trash2, Upload } from "lucide-react";
import { Button } from "./components";
import { Card, CardContent } from "./components";
import { SettingsModal, SettingsButton } from "./components";
import { motion, AnimatePresence } from "framer-motion";

const defaultCameras = [];

const defaultEquipments = [];

const defaultStatusOptions = [
  {
    id: crypto.randomUUID(),
    label: "Câmera OK, não há necessidade de intervenção",
  },
  {
    id: crypto.randomUUID(),
    label: "Câmera funcional, recomenda-se ajustar o apontamento",
  },
  {
    id: crypto.randomUUID(),
    label: "Câmera sem sinal",
  },
];

const defaultChecklistItems = [
  { id: "angle", label: "Ângulo correto" },
  { id: "imagePercent", label: "% de imagem adequado" },
  { id: "offline", label: "Câmera funcionando" },
];

const defaultSettings = {
  theme: "light",
  logo: null,
  logoFrame: false,
  headerImage: null,
  favicon: null,
  accentColor: "slate",
  appTitle: "Checklist diário de câmeras",
  appDescription: "Controle de conformidade, imagens e relatório em PDF.",
};

const today = new Date().toISOString().slice(0, 10);
const SETTINGS_STORAGE_KEY = "cameraChecklistSettings";
const INVENTORY_STORAGE_KEY = "cameraChecklistInventory";
const SETTINGS_IMAGE_DB = "cameraChecklistImageSettings";
const SETTINGS_IMAGE_STORE = "settings";
const SETTINGS_IMAGE_KEY = "images";

function repairLegacyText(value) {
  if (typeof value !== "string") return value;

  return value
    .replaceAll("CÃ¢mera", "Câmera")
    .replaceAll("cÃ¢mera", "câmera")
    .replaceAll("cÃ¢meras", "câmeras")
    .replaceAll("diÃ¡rio", "diário")
    .replaceAll("relatÃ³rio", "relatório")
    .replaceAll("configuraÃ§Ãµes", "configurações")
    .replaceAll("NÃ£o", "Não")
    .replaceAll("NÃƒO", "NÃO")
    .replaceAll("ResponsÃ¡vel", "Responsável")
    .replaceAll("LocalizaÃ§Ã£o", "Localização")
    .replaceAll("localizaÃ§Ã£o", "localização")
    .replaceAll("Ã‚ngulo", "Ângulo")
    .replaceAll("ObservaÃ§Ãµes", "Observações")
    .replaceAll("observaÃ§Ã£o", "observação")
    .replaceAll("descriÃ§Ã£o", "descrição")
    .replaceAll("Ã¢ngulo", "ângulo")
    .replaceAll("obstruÃ§Ã£o", "obstrução");
}

function repairSavedData(value) {
  if (Array.isArray(value)) return value.map(repairSavedData);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, repairSavedData(entry)])
    );
  }

  return repairLegacyText(value);
}

function loadStoredSettings() {
  try {
    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return savedSettings
      ? { ...defaultSettings, ...repairSavedData(JSON.parse(savedSettings)) }
      : defaultSettings;
  } catch (e) {
    console.error("Erro ao carregar configurações:", e);
    return defaultSettings;
  }
}

function openSettingsImageDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SETTINGS_IMAGE_DB, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(SETTINGS_IMAGE_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadStoredImageSettings() {
  try {
    const db = await openSettingsImageDb();
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(SETTINGS_IMAGE_STORE, "readonly");
      const store = transaction.objectStore(SETTINGS_IMAGE_STORE);
      const request = store.get(SETTINGS_IMAGE_KEY);

      request.onsuccess = () => resolve(request.result || {});
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error("Erro ao carregar imagens das configurações:", error);
    return {};
  }
}

async function saveStoredImageSettings(images) {
  const db = await openSettingsImageDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SETTINGS_IMAGE_STORE, "readwrite");
    const store = transaction.objectStore(SETTINGS_IMAGE_STORE);
    const request = store.put(images, SETTINGS_IMAGE_KEY);

    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

function getSettingsMetadata(settings) {
  const { logo, headerImage, favicon, ...metadata } = settings;
  return metadata;
}

function createCameraState(cam, index = 0) {
  const legacyChecks = {
    angle: cam.angle || "pending",
    imagePercent: cam.imagePercent || "pending",
    offline: cam.offline || "pending",
  };

  return {
    id: cam.id || crypto.randomUUID(),
    name: cam.name || `Câmera ${String(index + 1).padStart(2, "0")}`,
    location: cam.location || "",
    equipmentId: cam.equipmentId || "",
    statusOptionIds: Array.isArray(cam.statusOptionIds)
      ? cam.statusOptionIds
      : cam.statusOptionId
        ? [cam.statusOptionId]
        : [],
    checks: { ...legacyChecks, ...(cam.checks || {}) },
    wallPercent: "",
    notes: "",
    images: [],
    openImages: false,
  };
}

function loadStoredInventory() {
  try {
    const savedInventory = localStorage.getItem(INVENTORY_STORAGE_KEY);
    if (!savedInventory) {
      return {
        equipments: defaultEquipments,
        cameras: defaultCameras.map(createCameraState),
        unusedCameras: [],
        statusOptions: defaultStatusOptions,
        checklistItems: defaultChecklistItems,
      };
    }

    const parsed = repairSavedData(JSON.parse(savedInventory));
    const equipments = (parsed.equipments || []).map((equipment, index) => ({
      id: equipment.id || crypto.randomUUID(),
      type: equipment.type || "DVR",
      name: equipment.name || `DVR/NVR ${String(index + 1).padStart(2, "0")}`,
      location: equipment.location || "",
      ip: equipment.ip || "",
      adminUser: equipment.adminUser || "",
      adminPassword: equipment.adminPassword || "",
    }));
    const validEquipmentIds = new Set(equipments.map((equipment) => equipment.id));

    return {
      equipments,
      cameras: (parsed.cameras || []).map((cam, index) =>
        createCameraState(
          {
            ...cam,
            equipmentId: validEquipmentIds.has(cam.equipmentId) ? cam.equipmentId : "",
          },
          index
        )
      ),
      unusedCameras: (parsed.unusedCameras || []).map((cam, index) => ({
        id: cam.id || crypto.randomUUID(),
        name: cam.name || `Câmera fora de uso ${String(index + 1).padStart(2, "0")}`,
        previousSector: cam.previousSector || "",
        reason: cam.reason || "",
      })),
      statusOptions:
        Array.isArray(parsed.statusOptions)
          ? parsed.statusOptions.map((status, index) => ({
              id: status.id || crypto.randomUUID(),
              label: status.label || `Status ${index + 1}`,
            }))
          : defaultStatusOptions,
      checklistItems:
        Array.isArray(parsed.checklistItems)
          ? parsed.checklistItems.map((item, index) => ({
              id: item.id || crypto.randomUUID(),
              label: item.label || `Item ${index + 1}`,
            }))
          : defaultChecklistItems,
    };
  } catch (error) {
    console.error("Erro ao carregar cadastro:", error);
    return {
      equipments: defaultEquipments,
      cameras: defaultCameras.map(createCameraState),
      unusedCameras: [],
      statusOptions: defaultStatusOptions,
      checklistItems: defaultChecklistItems,
    };
  }
}

function getInventorySnapshot(equipments, cameras, unusedCameras, statusOptions, checklistItems) {
  return {
    equipments: equipments.map(({ id, type, name, location, ip, adminUser, adminPassword }) => ({
      id,
      type,
      name,
      location,
      ip,
      adminUser,
      adminPassword,
    })),
    cameras: cameras.map(({ id, name, location, equipmentId, statusOptionIds, checks }) => ({
      id,
      name,
      location,
      equipmentId,
      statusOptionIds,
      checks,
    })),
    unusedCameras: unusedCameras.map(({ id, name, previousSector, reason }) => ({
      id,
      name,
      previousSector,
      reason,
    })),
    statusOptions: statusOptions.map(({ id, label }) => ({ id, label })),
    checklistItems: checklistItems.map(({ id, label }) => ({ id, label })),
  };
}

function statusLabel(value) {
  if (value === "ok") return "OK";
  if (value === "review") return "Avaliar";
  return "Não Avaliado";
}

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

export default function CameraChecklistApp() {
  const initialInventory = useMemo(() => loadStoredInventory(), []);
  const [inspectionDate, setInspectionDate] = useState(today);
  const [inspector, setInspector] = useState("");
  const [siteName, setSiteName] = useState("");
  const [equipments, setEquipments] = useState(initialInventory.equipments);
  const [cameras, setCameras] = useState(initialInventory.cameras);
  const [unusedCameras, setUnusedCameras] = useState(initialInventory.unusedCameras);
  const [statusOptions, setStatusOptions] = useState(initialInventory.statusOptions);
  const [checklistItems, setChecklistItems] = useState(initialInventory.checklistItems);
  const [settings, setSettings] = useState(loadStoredSettings);
  const [settingsReady, setSettingsReady] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("");

  const fileInputRefs = useRef({});

  // Carregar configurações e imagens persistidas ao iniciar
  useEffect(() => {
    let active = true;

    async function loadSettings() {
      const storedSettings = loadStoredSettings();
      const storedImages = await loadStoredImageSettings();

      if (!active) return;

      setSettings({ ...storedSettings, ...storedImages });
      setSettingsReady(true);
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, []);

  // Aplicar tema ao documento
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
    document.documentElement.setAttribute("data-accent", settings.accentColor);
    document.body.setAttribute("data-theme", settings.theme);
  }, [settings.theme, settings.accentColor]);

  useEffect(() => {
    let favicon = document.querySelector("link[rel='icon']");
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      document.head.appendChild(favicon);
    }

    favicon.type = settings.favicon ? "image/x-icon" : "image/svg+xml";
    favicon.href = settings.favicon || "/vite.svg";
  }, [settings.favicon]);

  // Salvar configurações no localStorage
  useEffect(() => {
    if (!settingsReady) return;

    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(getSettingsMetadata(settings)));
      saveStoredImageSettings({
        logo: settings.logo,
        headerImage: settings.headerImage,
        favicon: settings.favicon,
      }).catch((error) => {
        console.error("Erro ao salvar imagens das configurações:", error);
        alert("Não foi possível salvar as imagens. Tente usar arquivos menores.");
      });
    } catch (e) {
      console.error("Erro ao salvar configurações:", e);
      alert("Não foi possível salvar as configurações.");
    }
  }, [settings, settingsReady]);

  useEffect(() => {
    try {
      localStorage.setItem(
        INVENTORY_STORAGE_KEY,
        JSON.stringify(
          getInventorySnapshot(equipments, cameras, unusedCameras, statusOptions, checklistItems)
        )
      );
    } catch (error) {
      console.error("Erro ao salvar cadastro:", error);
    }
  }, [equipments, cameras, unusedCameras, statusOptions, checklistItems]);

  const summary = useMemo(() => {
    const total = cameras.length;
    const compliant = cameras.filter((cam) => cameraIsCompliant(cam)).length;
    return {
      total,
      compliant,
      nonCompliant: total - compliant,
      unused: unusedCameras.length,
      equipments: equipments.length,
    };
  }, [cameras, equipments.length, unusedCameras.length, checklistItems]);

  const selectedEquipment = useMemo(
    () => equipments.find((equipment) => equipment.id === selectedEquipmentId) || null,
    [equipments, selectedEquipmentId]
  );

  const selectedEquipmentCameras = useMemo(
    () => cameras.filter((cam) => cam.equipmentId === selectedEquipmentId),
    [cameras, selectedEquipmentId]
  );

  useEffect(() => {
    if (!equipments.length) {
      setSelectedEquipmentId("");
      return;
    }

    if (!equipments.some((equipment) => equipment.id === selectedEquipmentId)) {
      setSelectedEquipmentId(equipments[0].id);
    }
  }, [equipments, selectedEquipmentId]);

  function equipmentLabel(equipmentId) {
    const equipment = equipments.find((item) => item.id === equipmentId);
    if (!equipment) return "Sem DVR/NVR";

    return `${equipment.type} - ${equipment.name}${equipment.location ? ` (${equipment.location})` : ""}`;
  }

  function statusOptionLabels(statusOptionIds = []) {
    return statusOptionIds
      .map((id) => statusOptions.find((status) => status.id === id)?.label)
      .filter(Boolean);
  }

  function updateCamera(id, patch) {
    setCameras((prev) => prev.map((cam) => (cam.id === id ? { ...cam, ...patch } : cam)));
  }

  function updateEquipment(id, patch) {
    setEquipments((prev) =>
      prev.map((equipment) => (equipment.id === id ? { ...equipment, ...patch } : equipment))
    );
  }

  function addEquipment() {
    const newEquipment = {
      id: crypto.randomUUID(),
      type: "DVR",
      name: `DVR/NVR ${String(equipments.length + 1).padStart(2, "0")}`,
      location: "",
      ip: "",
      adminUser: "",
      adminPassword: "",
    };

    setEquipments((prev) => [
      ...prev,
      newEquipment,
    ]);
    setSelectedEquipmentId(newEquipment.id);
  }

  function removeEquipment(id) {
    setEquipments((prev) => prev.filter((equipment) => equipment.id !== id));
    setCameras((prev) =>
      prev.map((cam) => (cam.equipmentId === id ? { ...cam, equipmentId: "" } : cam))
    );
  }

  function addCamera(equipmentId = selectedEquipmentId) {
    setCameras((prev) => [
      {
        id: crypto.randomUUID(),
        name: `Câmera ${String(prev.length + 1).padStart(2, "0")}`,
        location: "",
        equipmentId,
        statusOptionIds: [],
        checks: Object.fromEntries(checklistItems.map((item) => [item.id, "pending"])),
        wallPercent: "",
        notes: "",
        images: [],
        openImages: false,
      },
      ...prev,
    ]);
  }

  function removeCamera(id) {
    setCameras((prev) => prev.filter((cam) => cam.id !== id));
  }

  function updateUnusedCamera(id, patch) {
    setUnusedCameras((prev) => prev.map((cam) => (cam.id === id ? { ...cam, ...patch } : cam)));
  }

  function updateStatusOption(id, label) {
    setStatusOptions((prev) =>
      prev.map((status) => (status.id === id ? { ...status, label } : status))
    );
  }

  function addStatusOption() {
    setStatusOptions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: `Novo status ${String(prev.length + 1).padStart(2, "0")}`,
      },
    ]);
  }

  function removeStatusOption(id) {
    setStatusOptions((prev) => prev.filter((status) => status.id !== id));
    setCameras((prev) =>
      prev.map((cam) => ({
        ...cam,
        statusOptionIds: (cam.statusOptionIds || []).filter((statusId) => statusId !== id),
      }))
    );
  }

  function updateChecklistItem(id, label) {
    setChecklistItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, label } : item))
    );
  }

  function addChecklistItem() {
    const id = crypto.randomUUID();
    setChecklistItems((prev) => [
      ...prev,
      {
        id,
        label: `Novo item ${String(prev.length + 1).padStart(2, "0")}`,
      },
    ]);
    setCameras((prev) =>
      prev.map((cam) => ({
        ...cam,
        checks: { ...(cam.checks || {}), [id]: "pending" },
      }))
    );
  }

  function removeChecklistItem(id) {
    setChecklistItems((prev) => prev.filter((item) => item.id !== id));
    setCameras((prev) =>
      prev.map((cam) => {
        const { [id]: removed, ...remainingChecks } = cam.checks || {};
        return { ...cam, checks: remainingChecks };
      })
    );
  }

  function toggleCameraStatus(cameraId, statusId, checked) {
    setCameras((prev) =>
      prev.map((cam) => {
        if (cam.id !== cameraId) return cam;

        const current = cam.statusOptionIds || [];
        return {
          ...cam,
          statusOptionIds: checked
            ? Array.from(new Set([...current, statusId]))
            : current.filter((id) => id !== statusId),
        };
      })
    );
  }

  function addUnusedCamera() {
    setUnusedCameras((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: `Câmera fora de uso ${String(prev.length + 1).padStart(2, "0")}`,
        previousSector: "",
        reason: "",
      },
    ]);
  }

  function removeUnusedCamera(id) {
    setUnusedCameras((prev) => prev.filter((cam) => cam.id !== id));
  }

  async function handleImages(id, files) {
    const selected = Array.from(files || []);
    if (!selected.length) return;

    const converted = await Promise.all(
      selected.map(async (file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        src: await readFileAsDataUrl(file),
      }))
    );

    setCameras((prev) =>
      prev.map((cam) =>
        cam.id === id ? { ...cam, images: [...cam.images, ...converted], openImages: true } : cam
      )
    );
  }

  function handleObservationPaste(id, event) {
    const imageFiles = Array.from(event.clipboardData?.items || [])
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter(Boolean);

    if (!imageFiles.length) return;

    event.preventDefault();
    handleImages(id, imageFiles);
  }

  function removeImage(cameraId, imageId) {
    setCameras((prev) =>
      prev.map((cam) =>
        cam.id === cameraId
          ? { ...cam, images: cam.images.filter((img) => img.id !== imageId) }
          : cam
      )
    );
  }

  function cameraIsCompliant(cam) {
    return checklistItems.length > 0 && checklistItems.every((item) => cam.checks?.[item.id] === "ok");
  }

  function checklistSummary(cam) {
    if (!checklistItems.length) return "Nenhum item configurado";

    return checklistItems
      .map((item) => `${item.label}: ${statusLabel(cam.checks?.[item.id])}`)
      .join(" | ");
  }

  function buildReportRows() {
    return cameras.map((cam) => {
      const compliant = cameraIsCompliant(cam);
      const equipment = equipments.find((item) => item.id === cam.equipmentId);
      return {
        camera: cam.name,
        location: cam.location || "Não informado",
        equipment: equipmentLabel(cam.equipmentId),
        equipmentIp: equipment?.ip || "Não informado",
        equipmentAdminUser: equipment?.adminUser || "Não informado",
        equipmentAdminPassword: equipment?.adminPassword || "Não informado",
        customStatus: statusOptionLabels(cam.statusOptionIds).join(" | ") || "Não selecionado",
        status: compliant ? "OK" : "NÃO CONFORME",
        checklist: checklistSummary(cam),
        wallPercent: cam.wallPercent ? `${cam.wallPercent}%` : "Não informado",
        notes: cam.notes || (compliant ? "OK" : "Sem observação"),
        images: cam.images.length,
      };
    });
  }

  function exportCSV() {
    const rows = buildReportRows();
    const header = [
      "Data",
      "Local",
      "Responsável",
      "Tipo",
      "Câmera",
      "Ponto/Localização",
      "DVR/NVR",
      "IP DVR/NVR",
      "Usuário admin",
      "Senha",
      "Status pronto",
      "Status Geral",
      "Itens checados",
      "% informado",
      "Observações",
      "Qtd. imagens",
    ];

    const csvRows = [header.join(";")];
    rows.forEach((row) => {
      csvRows.push(
        [
          inspectionDate,
          siteName,
          inspector,
          "Em uso",
          row.camera,
          row.location,
          row.equipment,
          row.equipmentIp,
          row.equipmentAdminUser,
          row.equipmentAdminPassword,
          row.customStatus,
          row.status,
          row.checklist,
          row.wallPercent,
          row.notes,
          row.images,
        ]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(";")
      );
    });

    unusedCameras.forEach((cam) => {
      csvRows.push(
        [
          inspectionDate,
          siteName,
          inspector,
          "Fora de uso",
          cam.name,
          cam.previousSector || "Não informado",
          "Não atribuído",
          "Não aplicado",
          "Não aplicado",
          "Não aplicado",
          "Não aplicado",
          "FORA DE USO",
          "Não aplicado",
          "Não aplicado",
          cam.reason || "Sem observação",
          0,
        ]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(";")
      );
    });

    const blob = new Blob(["\ufeff" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `checklist-cameras-${inspectionDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function exportPDF() {
    try {
      const escapeHtml = (value) =>
        String(value ?? "")
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#039;");
      const logoClass = "logo logo-framed";
      const headerImageMarkup = settings.headerImage
        ? `<div class="cover"><img src="${settings.headerImage}" alt="Imagem de cabeçalho" /></div>`
        : "";
      const logoMarkup = settings.logo
        ? `<div class="${logoClass}"><img src="${settings.logo}" alt="Logo" /></div>`
        : "";
      const html = `
        <html>
          <head>
            <title>Relatório diário de câmeras</title>
            <style>
              @page { margin: 16mm; }
              * { box-sizing: border-box; }
              body { margin: 0; background: #f8fafc; color: #0f172a; font-family: Arial, Helvetica, sans-serif; line-height: 1.45; }
              .cover { width: 100%; height: 150px; overflow: hidden; background: #0f172a; border-bottom: 4px solid #f97316; }
              .cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
              .page { padding: 28px 32px 36px; }
              .report-header { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-bottom: 22px; }
              .brand { display: flex; align-items: center; gap: 16px; min-width: 0; }
              .logo { display: flex; align-items: center; justify-content: center; }
              .logo-framed { min-width: 150px; min-height: 78px; max-width: 210px; max-height: 92px; padding: 12px 18px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08); }
              .logo img { max-width: 100%; max-height: 72px; object-fit: contain; }
              h1 { margin: 0; font-size: 24px; letter-spacing: 0; }
              .subtitle { margin: 4px 0 0; color: #64748b; font-size: 12px; }
              .date-pill { border: 1px solid #cbd5e1; border-radius: 999px; color: #334155; font-size: 12px; font-weight: 700; padding: 8px 12px; white-space: nowrap; }
              .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 18px; }
              .meta-card, .box, .camera-block { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; }
              .meta-card { padding: 11px 12px; }
              .label { display: block; color: #64748b; font-size: 10px; font-weight: 700; text-transform: uppercase; }
              .value { display: block; margin-top: 3px; color: #0f172a; font-size: 13px; font-weight: 700; }
              .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin: 18px 0 22px; }
              .box { padding: 15px; text-align: center; }
              .box strong { color: #64748b; display: block; font-size: 11px; text-transform: uppercase; }
              .box span { color: #0f172a; display: block; font-size: 25px; font-weight: 800; margin-top: 4px; }
              .section-title { margin: 24px 0 10px; font-size: 16px; }
              table { width: 100%; border-collapse: separate; border-spacing: 0; overflow: hidden; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 10px; }
              th, td { border-bottom: 1px solid #e2e8f0; padding: 9px 10px; text-align: left; vertical-align: top; }
              th { background: #f1f5f9; color: #334155; font-size: 10px; text-transform: uppercase; }
              tr:last-child td { border-bottom: 0; }
              .badge { border-radius: 999px; display: inline-block; font-size: 9px; font-weight: 800; padding: 4px 8px; white-space: nowrap; }
              .ok { background: #dcfce7; color: #047857; }
              .nok { background: #fee2e2; color: #b91c1c; }
              .detail-list { display: grid; gap: 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
              .camera-block { padding: 14px; page-break-inside: avoid; }
              .camera-title { align-items: center; display: flex; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
              .camera-title h3 { font-size: 13px; margin: 0; }
              .camera-meta { color: #334155; display: grid; gap: 5px; font-size: 12px; margin-bottom: 10px; }
              .images { display: grid; gap: 8px; grid-template-columns: repeat(2, 1fr); margin-top: 10px; }
              .images img { border: 1px solid #e2e8f0; border-radius: 8px; height: 105px; object-fit: cover; width: 100%; }
              .empty-images { color: #94a3b8; font-size: 11px; padding-top: 2px; }
              .equipment-list { display: grid; gap: 10px; grid-template-columns: 1fr; margin-bottom: 22px; }
              .equipment-item { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
              .equipment-title { font-size: 12px; font-weight: 800; margin: 0 0 4px; }
              .equipment-details { color: #334155; display: grid; gap: 6px 18px; grid-template-columns: repeat(3, 1fr); font-size: 12px; margin-bottom: 10px; }
              .equipment-cameras { grid-column: 1 / -1; }
              .unused-list { display: grid; gap: 8px; margin-top: 10px; }
              .unused-item { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 11px 12px; }
              @media print { body { background: #ffffff; } .page { padding: 22px 0 0; } .cover { margin: -16mm -16mm 0; width: calc(100% + 32mm); } }
            </style>
          </head>
          <body>
            ${headerImageMarkup}
            <main class="page">
              <section class="report-header">
                <div class="brand">
                  ${logoMarkup}
                  <div>
                    <h1>${escapeHtml(settings.appTitle || "Relatório diário de verificação de câmeras")}</h1>
                    <p class="subtitle">${escapeHtml(settings.appDescription || "Controle de conformidade, imagens e relatório em PDF.")}</p>
                  </div>
                </div>
                <div class="date-pill">${escapeHtml(inspectionDate)}</div>
              </section>

              <section class="meta-grid">
                <div class="meta-card"><span class="label">Local</span><span class="value">${escapeHtml(siteName || "Não informado")}</span></div>
                <div class="meta-card"><span class="label">Responsável</span><span class="value">${escapeHtml(inspector || "Não informado")}</span></div>
                <div class="meta-card"><span class="label">Gerado em</span><span class="value">${new Date().toLocaleDateString("pt-BR")}</span></div>
              </section>

              <section class="summary">
                <div class="box"><strong>Total</strong><span>${summary.total}</span></div>
                <div class="box"><strong>Conformes</strong><span>${summary.compliant}</span></div>
                <div class="box"><strong>Não conformes</strong><span>${summary.nonCompliant}</span></div>
                <div class="box"><strong>DVR/NVR</strong><span>${summary.equipments}</span></div>
                <div class="box"><strong>Fora de uso</strong><span>${summary.unused}</span></div>
              </section>

              <h2 class="section-title">Equipamentos DVR/NVR</h2>
              <section class="equipment-list">
                ${
                  equipments.length
                    ? equipments
                        .map(
                          (equipment) => `
                            <div class="equipment-item">
                              <p class="equipment-title">${escapeHtml(equipment.type)} - ${escapeHtml(equipment.name || "Sem nome")}</p>
                              <div class="equipment-details">
                                <div><strong>Local:</strong> ${escapeHtml(equipment.location || "Não informado")}</div>
                                <div><strong>IP:</strong> ${escapeHtml(equipment.ip || "Não informado")}</div>
                                <div><strong>Usuário admin:</strong> ${escapeHtml(equipment.adminUser || "Não informado")}</div>
                                <div><strong>Senha:</strong> ${escapeHtml(equipment.adminPassword || "Não informado")}</div>
                                <div><strong>Câmeras atribuídas:</strong> ${cameras.filter((cam) => cam.equipmentId === equipment.id).length}</div>
                                <div class="equipment-cameras"><strong>Lista:</strong> ${escapeHtml(
                                  cameras
                                    .filter((cam) => cam.equipmentId === equipment.id)
                                    .map((cam) => cam.name)
                                    .join(", ") || "Nenhuma câmera atribuída"
                                )}</div>
                              </div>
                            </div>
                          `
                        )
                        .join("")
                    : `<div class="empty-images">Nenhum DVR/NVR cadastrado.</div>`
                }
              </section>

              <h2 class="section-title">Detalhamento com imagens</h2>
              <section class="detail-list">
                ${cameras
                  .map((cam) => {
                    const compliant = cameraIsCompliant(cam);
                    return `
                      <article class="camera-block">
                        <div class="camera-title">
                          <h3>${escapeHtml(cam.name)}</h3>
                          <span class="badge ${compliant ? "ok" : "nok"}">${compliant ? "OK" : "NÃO CONFORME"}</span>
                        </div>
                        <div class="camera-meta">
                          <div><strong>Localização:</strong> ${escapeHtml(cam.location || "Não informado")}</div>
                          <div><strong>DVR/NVR:</strong> ${escapeHtml(equipmentLabel(cam.equipmentId))}</div>
                          <div><strong>Itens checados:</strong> ${escapeHtml(checklistSummary(cam))}</div>
                          <div><strong>Status pronto:</strong> ${escapeHtml(statusOptionLabels(cam.statusOptionIds).join(" | ") || "Não selecionado")}</div>
                          <div><strong>Observações:</strong> ${escapeHtml(cam.notes || (compliant ? "OK" : "Sem observação"))}</div>
                        </div>
                        ${
                          cam.images.length
                            ? `<div class="images">${cam.images
                                .map((img) => `<img src="${img.src}" alt="${escapeHtml(img.name)}" />`)
                                .join("")}</div>`
                            : `<div class="empty-images">Nenhuma imagem anexada.</div>`
                        }
                      </article>
                    `;
                  })
                  .join("")}
              </section>

              <h2 class="section-title">Câmeras fora de uso</h2>
              <section class="unused-list">
                ${
                  unusedCameras.length
                    ? unusedCameras
                        .map(
                          (cam) => `
                            <article class="unused-item">
                              <div class="camera-title">
                                <h3>${escapeHtml(cam.name || "Câmera sem nome")}</h3>
                                <span class="badge nok">FORA DE USO</span>
                              </div>
                              <div class="camera-meta">
                                <div><strong>Setor anterior:</strong> ${escapeHtml(cam.previousSector || "Não informado")}</div>
                                <div><strong>Observações:</strong> ${escapeHtml(cam.reason || "Sem observação")}</div>
                              </div>
                            </article>
                          `
                        )
                        .join("")
                    : `<div class="empty-images">Nenhuma câmera fora de uso registrada.</div>`
                }
              </section>
            </main>
          </body>
        </html>
      `;

      const reportWindow = window.open("", "_blank");
      reportWindow.document.write(html);
      reportWindow.document.close();
      reportWindow.focus();

      setTimeout(() => {
        reportWindow.print();
      }, 300);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar o PDF. Por favor, tente novamente.");
    }
  }

  function saveTemplate() {
    const template = {
      equipments: equipments.map(({ id, type, name, location, ip, adminUser, adminPassword }) => ({
        id,
        type,
        name,
        location,
        ip,
        adminUser,
        adminPassword,
      })),
      cameras: cameras.map(({ name, location, equipmentId, statusOptionIds }) => ({
        name,
        location,
        equipmentId,
        statusOptionIds,
      })),
      unusedCameras: unusedCameras.map(({ name, previousSector, reason }) => ({
        name,
        previousSector,
        reason,
      })),
      statusOptions: statusOptions.map(({ id, label }) => ({ id, label })),
      checklistItems: checklistItems.map(({ id, label }) => ({ id, label })),
    };
    localStorage.setItem("cameraChecklistTemplate", JSON.stringify(template));
    alert("Modelo salvo no navegador para próximas verificações.");
  }

  function loadTemplate() {
    const saved = localStorage.getItem("cameraChecklistTemplate");
    if (!saved) {
      alert("Nenhum modelo salvo encontrado.");
      return;
    }
    const template = repairSavedData(JSON.parse(saved));
    const templateEquipments = Array.isArray(template)
      ? []
      : (template.equipments || []).map((equipment, index) => ({
          id: equipment.id || crypto.randomUUID(),
          type: equipment.type || "DVR",
          name: equipment.name || `DVR/NVR ${String(index + 1).padStart(2, "0")}`,
          location: equipment.location || "",
          ip: equipment.ip || "",
          adminUser: equipment.adminUser || "",
          adminPassword: equipment.adminPassword || "",
        }));
    const safeEquipments = templateEquipments.length ? templateEquipments : [];
    const validEquipmentIds = new Set(safeEquipments.map((equipment) => equipment.id));
    const templateStatusOptions = Array.isArray(template)
      ? defaultStatusOptions
      : Array.isArray(template.statusOptions)
        ? template.statusOptions.map((status, index) => ({
            id: status.id || crypto.randomUUID(),
            label: status.label || `Status ${index + 1}`,
          }))
        : defaultStatusOptions;
    const validStatusOptionIds = new Set(templateStatusOptions.map((status) => status.id));
    const templateChecklistItems = Array.isArray(template)
      ? defaultChecklistItems
      : Array.isArray(template.checklistItems)
        ? template.checklistItems.map((item, index) => ({
            id: item.id || crypto.randomUUID(),
            label: item.label || `Item ${index + 1}`,
          }))
        : defaultChecklistItems;
    const templateCameras = Array.isArray(template) ? template : template.cameras || [];

    setEquipments(safeEquipments);
    setSelectedEquipmentId(safeEquipments[0]?.id || "");
    setStatusOptions(templateStatusOptions);
    setChecklistItems(templateChecklistItems);
    setCameras(
      templateCameras.map((cam) => ({
        id: crypto.randomUUID(),
        name: cam.name,
        location: cam.location,
        equipmentId: validEquipmentIds.has(cam.equipmentId)
          ? cam.equipmentId
          : safeEquipments[0]?.id || "",
        statusOptionIds: Array.isArray(cam.statusOptionIds)
          ? cam.statusOptionIds.filter((statusId) => validStatusOptionIds.has(statusId))
          : validStatusOptionIds.has(cam.statusOptionId)
            ? [cam.statusOptionId]
            : [],
        checks: {
          ...Object.fromEntries(templateChecklistItems.map((item) => [item.id, "pending"])),
          ...(cam.checks || {}),
        },
        wallPercent: "",
        notes: "",
        images: [],
        openImages: false,
      }))
    );
    setUnusedCameras(
      Array.isArray(template)
        ? []
        : (template.unusedCameras || []).map((cam, index) => ({
            id: crypto.randomUUID(),
            name: cam.name || `Câmera fora de uso ${String(index + 1).padStart(2, "0")}`,
            previousSector: cam.previousSector || "",
            reason: cam.reason || "",
          }))
    );
  }

  const fieldClass = "theme-field w-full rounded-xl border p-2";
  const labelClass = "theme-label text-sm font-medium";

  return (
    <div className="app-shell min-h-screen transition-colors duration-300">
      {/* Header Image */}
      {settings.headerImage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full overflow-hidden shadow-lg"
        >
          <img src={settings.headerImage} alt="Header" className="h-56 w-full object-cover" />
        </motion.div>
      )}

      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">

        {/* Header */}
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {settings.logo && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className={
                  settings.theme === "light" && settings.logoFrame
                    ? "flex h-20 min-w-28 items-center justify-center rounded-2xl border border-white/80 bg-white px-5 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
                    : "flex h-16 items-center"
                }
              >
                <img src={settings.logo} alt="Logo" className="max-h-full max-w-44 object-contain" />
              </motion.div>
            )}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{settings.appTitle}</h1>
              <p className="theme-muted mt-1">
                {settings.appDescription}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Button onClick={loadTemplate} variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Carregar modelo
            </Button>
            <Button onClick={saveTemplate} variant="outline">
              <Save className="mr-2 h-4 w-4" />
              Salvar modelo
            </Button>
            <Button onClick={exportCSV} variant="outline">
              <FileDown className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button onClick={exportPDF}>
              <FileDown className="mr-2 h-4 w-4" />
              PDF
            </Button>
            <SettingsButton onClick={() => setShowSettings(true)} />
          </div>
        </header>

        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          settings={settings}
          onSettingsChange={setSettings}
          statusOptions={statusOptions}
          onAddStatusOption={addStatusOption}
          onUpdateStatusOption={updateStatusOption}
          onRemoveStatusOption={removeStatusOption}
          checklistItems={checklistItems}
          onAddChecklistItem={addChecklistItem}
          onUpdateChecklistItem={updateChecklistItem}
          onRemoveChecklistItem={removeChecklistItem}
        />

        <div className="grid gap-4 md:grid-cols-5">
          <SummaryCard title="Total de câmeras" value={summary.total} theme={settings.theme} />
          <SummaryCard title="Em conformidade" value={summary.compliant} theme={settings.theme} />
          <SummaryCard
            title="Com apontamentos"
            value={summary.nonCompliant}
            theme={settings.theme}
          />
          <SummaryCard title="DVR/NVR" value={summary.equipments} theme={settings.theme} />
          <SummaryCard title="Fora de uso" value={summary.unused} theme={settings.theme} />
        </div>

        <Card className="theme-panel rounded-2xl">
          <CardContent className="grid gap-4 p-4 md:grid-cols-4">
            <label className="space-y-1">
              <span className={labelClass}>Data</span>
              <input
                className={fieldClass}
                type="date"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
              />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className={labelClass}>Local / ambiente</span>
              <input
                className={fieldClass}
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className={labelClass}>Responsável</span>
              <input
                className={fieldClass}
                value={inspector}
                onChange={(e) => setInspector(e.target.value)}
                placeholder="Nome"
              />
            </label>
          </CardContent>
        </Card>

        <Card className="theme-panel rounded-2xl">
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid flex-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
                <label className="space-y-1">
                  <span className={labelClass}>DVR/NVR</span>
                  <select
                    className={fieldClass}
                    value={selectedEquipmentId}
                    onChange={(e) => setSelectedEquipmentId(e.target.value)}
                  >
                    <option value="">Selecione um dispositivo</option>
                    {equipments.map((equipment) => (
                      <option key={equipment.id} value={equipment.id}>
                        {equipment.type} - {equipment.name || "Sem nome"}
                      </option>
                    ))}
                  </select>
                </label>
                <Button onClick={addEquipment} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar DVR/NVR
                </Button>
              </div>
            </div>

            {selectedEquipment ? (
              <div className="space-y-4">
                <div className="theme-subpanel rounded-2xl border p-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-xl font-bold">Dados do dispositivo</h2>
                      <p className="theme-muted text-sm">
                        Edite as informações do DVR/NVR selecionado.
                      </p>
                    </div>
                    <Button variant="ghost" onClick={() => removeEquipment(selectedEquipment.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir dispositivo
                    </Button>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-[110px_1fr_1fr_1fr]">
                    <label className="space-y-1">
                      <span className={labelClass}>Tipo</span>
                      <select
                        className={fieldClass}
                        value={selectedEquipment.type}
                        onChange={(e) =>
                          updateEquipment(selectedEquipment.id, { type: e.target.value })
                        }
                      >
                        <option value="DVR">DVR</option>
                        <option value="NVR">NVR</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className={labelClass}>Nome</span>
                      <input
                        className={fieldClass}
                        value={selectedEquipment.name}
                        onChange={(e) =>
                          updateEquipment(selectedEquipment.id, { name: e.target.value })
                        }
                        placeholder="Ex: DVR recepção"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className={labelClass}>Local</span>
                      <input
                        className={fieldClass}
                        value={selectedEquipment.location}
                        onChange={(e) =>
                          updateEquipment(selectedEquipment.id, { location: e.target.value })
                        }
                        placeholder="Ex: Rack TI"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className={labelClass}>IP</span>
                      <input
                        className={fieldClass}
                        value={selectedEquipment.ip}
                        onChange={(e) =>
                          updateEquipment(selectedEquipment.id, { ip: e.target.value })
                        }
                        placeholder="Ex: 192.168.1.10"
                      />
                    </label>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="space-y-1">
                      <span className={labelClass}>Usuário admin</span>
                      <input
                        className={fieldClass}
                        value={selectedEquipment.adminUser}
                        onChange={(e) =>
                          updateEquipment(selectedEquipment.id, { adminUser: e.target.value })
                        }
                        placeholder="Ex: admin"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className={labelClass}>Senha</span>
                      <input
                        className={fieldClass}
                        type="password"
                        value={selectedEquipment.adminPassword}
                        onChange={(e) =>
                          updateEquipment(selectedEquipment.id, {
                            adminPassword: e.target.value,
                          })
                        }
                        placeholder="Senha de acesso"
                      />
                    </label>
                  </div>

                  <p className="theme-muted mt-3 flex items-center gap-2 text-xs">
                    <Server className="h-3.5 w-3.5" />
                    {selectedEquipmentCameras.length} câmera(s) cadastrada(s) neste dispositivo
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => addCamera(selectedEquipment.id)} variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar câmera neste dispositivo
                  </Button>
                </div>
              </div>
            ) : (
              <div className="theme-subpanel rounded-2xl border p-4 text-sm theme-muted">
                Adicione ou selecione um DVR/NVR para cadastrar câmeras dentro dele.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {selectedEquipmentCameras.map((cam) => {
            const compliant = cameraIsCompliant(cam);
            return (
              <motion.div
                key={cam.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="theme-panel rounded-2xl">
                  <CardContent className="space-y-4 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="grid flex-1 gap-3 md:grid-cols-2">
                        <label className="space-y-1">
                          <span className={labelClass}>Câmera</span>
                          <input
                            className={fieldClass}
                            value={cam.name}
                            onChange={(e) => updateCamera(cam.id, { name: e.target.value })}
                          />
                        </label>
                        <label className="space-y-1">
                          <span className={labelClass}>Ponto / localização</span>
                          <input
                            className={fieldClass}
                            value={cam.location}
                            onChange={(e) =>
                              updateCamera(cam.id, { location: e.target.value })
                            }
                            placeholder="Ex: Entrada principal"
                          />
                        </label>
                      </div>
                      <div
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${
                          compliant ? "status-ok" : "status-warning"
                        }`}
                      >
                        {compliant ? "OK" : "Verificar"}
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-4">
                      {checklistItems.map((item) => (
                        <ChecklistSelect
                          key={item.id}
                          label={item.label}
                          value={cam.checks?.[item.id] || "pending"}
                          onChange={(value) =>
                            updateCamera(cam.id, {
                              checks: { ...(cam.checks || {}), [item.id]: value },
                            })
                          }
                        />
                      ))}
                      <label className="space-y-1">
                        <span className={labelClass}>% parede / obstrução</span>
                        <input
                          className={fieldClass}
                          type="number"
                          min="0"
                          max="100"
                          value={cam.wallPercent}
                          onChange={(e) =>
                            updateCamera(cam.id, { wallPercent: e.target.value })
                          }
                          placeholder="Ex: 40"
                        />
                      </label>
                    </div>

                    <div className="space-y-2">
                      <span className={labelClass}>Status prontos para o relatório</span>
                      {statusOptions.length ? (
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {statusOptions.map((status) => (
                            <label
                              key={status.id}
                              className="theme-subpanel flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-xs leading-snug"
                            >
                              <input
                                type="checkbox"
                                checked={(cam.statusOptionIds || []).includes(status.id)}
                                onChange={(e) =>
                                  toggleCameraStatus(cam.id, status.id, e.target.checked)
                                }
                                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent-color)]"
                              />
                              <span>{status.label}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="theme-muted text-xs">
                          Nenhum status pronto cadastrado.
                        </p>
                      )}
                    </div>

                    <label className="block space-y-1">
                      <span className={labelClass}>
                        Observações / descrição da não conformidade
                      </span>
                      <textarea
                        className={`${fieldClass} min-h-20`}
                        value={cam.notes}
                        onChange={(e) => updateCamera(cam.id, { notes: e.target.value })}
                        onPaste={(e) => handleObservationPaste(cam.id, e)}
                        placeholder="Ex: imagem pegando muita parede, câmera sem sinal, ângulo incorreto..."
                      />
                      <span className="theme-muted block text-xs">
                        Você também pode colar imagens aqui para anexá-las à câmera.
                      </span>
                    </label>

                    <div
                      className="theme-subpanel rounded-2xl border"
                    >
                      <button
                        className="flex w-full items-center justify-between p-3 text-left"
                        onClick={() =>
                          updateCamera(cam.id, { openImages: !cam.openImages })
                        }
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <Camera className="h-4 w-4" />
                          Imagens anexadas ({cam.images.length})
                        </span>
                        {cam.openImages ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                      <AnimatePresence>
                        {cam.openImages && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-3 border-t border-[var(--panel-border)] p-3">
                              <input
                                ref={(el) => (fileInputRefs.current[cam.id] = el)}
                                hidden
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => handleImages(cam.id, e.target.files)}
                              />
                              <Button
                                variant="outline"
                                onClick={() => fileInputRefs.current[cam.id]?.click()}
                              >
                                <ImagePlus className="mr-2 h-4 w-4" />
                                Anexar imagens
                              </Button>
                              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                                {cam.images.map((img) => (
                                  <div
                                    key={img.id}
                                    className="theme-subpanel relative rounded-xl border p-2"
                                  >
                                    <img
                                      src={img.src}
                                      alt={img.name}
                                      className="h-32 w-full rounded-lg object-cover"
                                    />
                                    <p className="theme-muted mt-1 truncate text-xs">
                                      {img.name}
                                    </p>
                                    <button
                                      className="absolute right-3 top-3 rounded-full bg-[var(--panel-bg)] p-1 text-[var(--page-text)] shadow"
                                      onClick={() => removeImage(cam.id, img.id)}
                                      title="Remover imagem"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="flex justify-end">
                      <Button variant="ghost" onClick={() => removeCamera(cam.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remover câmera
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
          {selectedEquipment && !selectedEquipmentCameras.length && (
            <Card className="theme-panel rounded-2xl">
              <CardContent className="p-4 text-sm theme-muted">
                Nenhuma câmera cadastrada neste dispositivo.
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="theme-panel rounded-2xl">
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold">Câmeras fora de uso</h2>
                <p className="theme-muted text-sm">
                  Registre câmeras que não estão em operação e o setor onde estavam instaladas.
                </p>
              </div>
              <Button onClick={addUnusedCamera} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar câmera fora de uso
              </Button>
            </div>

            {unusedCameras.length ? (
              <div className="space-y-3">
                {unusedCameras.map((cam) => (
                  <div key={cam.id} className="theme-subpanel rounded-2xl border p-3">
                    <div className="grid gap-3 md:grid-cols-[1fr_1fr_1.4fr_auto] md:items-end">
                      <label className="space-y-1">
                        <span className={labelClass}>Câmera</span>
                        <input
                          className={fieldClass}
                          value={cam.name}
                          onChange={(e) => updateUnusedCamera(cam.id, { name: e.target.value })}
                          placeholder="Ex: Câmera 12"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className={labelClass}>Setor anterior</span>
                        <input
                          className={fieldClass}
                          value={cam.previousSector}
                          onChange={(e) =>
                            updateUnusedCamera(cam.id, { previousSector: e.target.value })
                          }
                          placeholder="Ex: Estoque"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className={labelClass}>Observação</span>
                        <input
                          className={fieldClass}
                          value={cam.reason}
                          onChange={(e) => updateUnusedCamera(cam.id, { reason: e.target.value })}
                          placeholder="Ex: retirada para manutenção"
                        />
                      </label>
                      <button
                        className="btn-ghost flex h-10 items-center justify-center rounded-lg px-3"
                        onClick={() => removeUnusedCamera(cam.id)}
                        title="Remover câmera fora de uso"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="theme-subpanel rounded-2xl border p-4 text-sm theme-muted">
                Nenhuma câmera fora de uso registrada.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, theme }) {
  return (
    <Card className="theme-panel rounded-2xl">
      <CardContent className="p-4">
        <p className="theme-muted text-sm">
          {title}
        </p>
        <p className="mt-2 text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function ChecklistSelect({ label, value, onChange }) {
  return (
    <label className="space-y-1">
      <span className="theme-label text-sm font-medium">{label}</span>
      <select
        className="theme-field w-full rounded-xl border p-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="ok">OK</option>
        <option value="review">Avaliar</option>
        <option value="pending">Não Avaliado</option>
      </select>
    </label>
  );
}

