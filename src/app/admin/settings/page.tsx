import PageHeader from "@/components/admin/PageHeader";
import SettingsForm from "@/components/admin/SettingsForm";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Настройки"
        meta="Бренд, акцентный цвет, язык и адрес для QR-кодов"
      />
      <SettingsForm settings={getSettings()} />
    </>
  );
}
