import { Switch } from "../ui/switch";

export default function SettingsToggle({
  header,
  description,
  checked,
  onCheckedChange,
}: {
  header: string;
  description: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <div className="flex justify-between">
      <div>
        <p className="text-sm font-medium">{header}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      <div className="flex items-center self-start">
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </div>
  );
}
