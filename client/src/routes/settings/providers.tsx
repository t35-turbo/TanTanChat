import { PageBack } from "@/components/settings/BackButtons";
import { LocalKey } from "@/components/settings/LocalKey";
import ProvidersTable, { type ProviderAction } from "@/components/settings/ProvidersTable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { __client, type RouterOutput } from "@/lib/trpc";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Plus } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/settings/providers")({
  component: RouteComponent,
});

type ProviderType = RouterOutput["settings"]["getProvider"]["type"];
const providerTypes: Record<ProviderType, { id: ProviderType; label: string; defaultBaseURL: string }> = {
  openai: { id: "openai", label: "OpenAI", defaultBaseURL: "https://api.openai.com/v1" },
  anthropic: { id: "anthropic", label: "Anthropic", defaultBaseURL: "https://api.anthropic.com/v1" },
  google: { id: "google", label: "Google", defaultBaseURL: "https://generativelanguage.googleapis.com/v1beta" },
  mistral: { id: "mistral", label: "Mistral", defaultBaseURL: "https://api.mistral.ai/v1" },
  deepseek: { id: "deepseek", label: "DeepSeek", defaultBaseURL: "https://api.deepseek.com/v1" },
  grok: { id: "grok", label: "Grok", defaultBaseURL: "https://api.x.ai/v1" },
} as const;

function RouteComponent() {
  const providerAction: ProviderAction = () => {}; // to be a useMutation

  return (
    <Dialog>
      <div className="flex w-full flex-col gap-2 p-4">
        <PageBack />

        <h1 className="p-2 text-2xl font-bold">Key Management</h1>
        <KeysTable />

        <div className="flex">
          <DialogTrigger asChild>
            <Button className="ml-auto">
              <Plus />
              Add Provider
            </Button>
          </DialogTrigger>
        </div>
        <ProvidersTable
          providers={[
            {
              name: "Local OpenRouter",
              id: "openrouter_local",
              type: "openai",
              baseUrl: "https://openrouter.ai/api/v1",
              modelsCount: 0,
            },
          ]}
          action={providerAction}
        />
      </div>

      <AddProviderDialog />
    </Dialog>
  );
}

function AddProviderDialog() {
  const [selectedType, setSelectedType] = useState<ProviderType>("openai");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");

  const addProvider = useMutation({
    mutationFn: async (evt: React.FormEvent<HTMLFormElement>) => {
      const target = evt.target as typeof evt.target & {
        name: { value: string };
        apiKey: { value: string };
        baseUrl: { value: string };
      };

      __client.settings.addProvider.mutate({
        scope: "user",
        baseUrl: target.baseUrl.value,
        enabled: true,
        type: selectedType,
        name: target.name.value,
        apiKey: target.apiKey.value,
      });
    },
  });

  const handleTypeChange = (type: ProviderType) => {
    setSelectedType(type);
    const selectedProvider = providerTypes[type];
    if (selectedProvider) {
      setBaseUrl(selectedProvider.defaultBaseURL);
    }
  };

  return (
    <DialogContent>
      <form
        className="space-y-2"
        onSubmit={(evt) => {
          addProvider.mutate(evt);
          evt.preventDefault();
          return false;
        }}
      >
        <DialogHeader className="mb-4">
          <DialogTitle>Add Provider</DialogTitle>
        </DialogHeader>

        <Label htmlFor="name">Provider Name</Label>
        <Input type="text" name="name" placeholder="Enter Provider name" />

        <Label htmlFor="type" className="mt-3">
          Provider Type
        </Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between md:w-1/2">
              {providerTypes[selectedType]?.label}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-full">
            {Object.values(providerTypes).map((type) => (
              <DropdownMenuItem key={type.label} onClick={() => handleTypeChange(type.id)}>
                {type.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Label className="mt-3" htmlFor="baseUrl">
          Base URL
        </Label>
        <Input
          type="text"
          name="baseUrl"
          placeholder="Enter base URL"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
        />

        <Label className="mt-3" htmlFor="apiKey">
          API Key
        </Label>
        <Input type="password" name="apiKey" placeholder="Enter API key" />

        <DialogFooter className="mt-4">
          <Button type="submit">Submit</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function KeysTable() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Base URL</TableHead>
          <TableHead>Key</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <LocalKey />
      </TableBody>
    </Table>
  );
}
