import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import PreLoader from "@/components/Preloader";
import ChatModelSelection from "./ChatModelSelection";
import { useTranslation } from "react-i18next";
import { PROVIDER_SETUP_EVENT, SAVE_LLM_SELECTOR_EVENT } from "./action";
import {
  WORKSPACE_LLM_PROVIDERS,
  autoScrollToSelectedLLMProvider,
  hasMissingCredentials,
  validatedModelSelection,
} from "./utils";
import LLMSelectorSidePanel from "./LLMSelector";
import { NoSetupWarning } from "./SetupProvider";
import showToast from "@/utils/toast";
import Workspace from "@/models/workspace";
import System from "@/models/system";

// Providers whose API accepts the OpenRouter `reasoning` parameter
const REASONING_CAPABLE_PROVIDERS = ["openrouter", "generic-openai"];

const REASONING_EFFORT_OPTIONS = [
  { value: "", label: "chat_window.workspace_llm_manager.reasoning_off" },
  { value: "minimal", label: "chat_window.workspace_llm_manager.reasoning_minimal" },
  { value: "low", label: "chat_window.workspace_llm_manager.reasoning_low" },
  { value: "medium", label: "chat_window.workspace_llm_manager.reasoning_medium" },
  { value: "high", label: "chat_window.workspace_llm_manager.reasoning_high" },
  { value: "xhigh", label: "chat_window.workspace_llm_manager.reasoning_xhigh" },
];

export default function LLMSelectorModal() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(null);
  const [selectedLLMProvider, setSelectedLLMProvider] = useState(null);
  const [selectedLLMModel, setSelectedLLMModel] = useState("");
  const [selectedReasoningEffort, setSelectedReasoningEffort] = useState("");
  const [availableProviders, setAvailableProviders] = useState(
    WORKSPACE_LLM_PROVIDERS
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [missingCredentials, setMissingCredentials] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    Promise.all([Workspace.bySlug(slug), System.keys()])
      .then(([workspace, systemSettings]) => {
        const selectedLLMProvider =
          workspace.chatProvider ?? systemSettings.LLMProvider;
        const selectedLLMModel = workspace.chatModel ?? systemSettings.LLMModel;

        setSettings(systemSettings);
        setSelectedLLMProvider(selectedLLMProvider);
        autoScrollToSelectedLLMProvider(selectedLLMProvider);
        setSelectedLLMModel(selectedLLMModel);
        setSelectedReasoningEffort(workspace.chatReasoningEffort ?? "");
      })
      .finally(() => setLoading(false));
  }, [slug]);

  function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filteredProviders = WORKSPACE_LLM_PROVIDERS.filter((provider) =>
      provider.name.toLowerCase().includes(searchTerm)
    );
    setAvailableProviders(filteredProviders);
  }

  function handleProviderSelection(provider) {
    setSelectedLLMProvider(provider);
    setAvailableProviders(WORKSPACE_LLM_PROVIDERS);
    autoScrollToSelectedLLMProvider(provider, 50);
    document.getElementById("llm-search-input").value = "";
    setHasChanges(true);
    setMissingCredentials(hasMissingCredentials(settings, provider));
  }

  async function handleSave() {
    setSaving(true);
    try {
      setHasChanges(false);
      const validatedModel = validatedModelSelection(selectedLLMModel);
      if (!validatedModel) throw new Error("Invalid model selection");

      const { message } = await Workspace.update(slug, {
        chatProvider: selectedLLMProvider,
        chatModel: validatedModel,
        chatReasoningEffort: selectedReasoningEffort || null,
      });

      if (!!message) throw new Error(message);
      window.dispatchEvent(new Event(SAVE_LLM_SELECTOR_EVENT));
    } catch (error) {
      console.error(error);
      showToast(error.message, "error", { clear: true });
    } finally {
      setSaving(false);
    }
  }

  const showReasoningEffort = REASONING_CAPABLE_PROVIDERS.includes(selectedLLMProvider);

  if (loading) {
    return (
      <div
        id="llm-selector-modal"
        className="w-full h-[500px] p-0 overflow-y-scroll flex flex-col items-center justify-center"
      >
        <PreLoader size={12} />
        <p className="text-theme-text-secondary text-sm mt-2">
          {t("chat_window.workspace_llm_manager.loading_workspace_settings")}
        </p>
      </div>
    );
  }

  return (
    <div
      id="llm-selector-modal"
      className="w-full h-[500px] p-0 overflow-y-scroll flex"
    >
      <LLMSelectorSidePanel
        availableProviders={availableProviders}
        selectedLLMProvider={selectedLLMProvider}
        onSearchChange={handleSearch}
        onProviderClick={handleProviderSelection}
      />
      <div className="w-[60%] h-full px-2 flex flex-col gap-y-2">
        <NoSetupWarning
          showing={missingCredentials}
          onSetupClick={() => {
            window.dispatchEvent(
              new CustomEvent(PROVIDER_SETUP_EVENT, {
                detail: {
                  provider: WORKSPACE_LLM_PROVIDERS.find(
                    (p) => p.value === selectedLLMProvider
                  ),
                  settings,
                },
              })
            );
          }}
        />
        <ChatModelSelection
          provider={selectedLLMProvider}
          setHasChanges={setHasChanges}
          selectedLLMModel={selectedLLMModel}
          setSelectedLLMModel={setSelectedLLMModel}
        />
        {showReasoningEffort && (
          <div>
            <div className="flex flex-col">
              <label className="block input-label">
                {t("chat_window.workspace_llm_manager.reasoning_effort")}
              </label>
              <p className="text-white text-opacity-60 text-xs font-medium py-1.5">
                {t("chat_window.workspace_llm_manager.reasoning_effort_description")}
              </p>
            </div>
            <select
              value={selectedReasoningEffort}
              onChange={(e) => {
                setSelectedReasoningEffort(e.target.value);
                setHasChanges(true);
              }}
              className="border-theme-modal-border border border-solid bg-theme-settings-input-bg text-white text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            >
              {REASONING_EFFORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.label)}
                </option>
              ))}
            </select>
          </div>
        )}
        {hasChanges && (
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className={`border-none text-xs px-4 py-1 font-semibold light:text-[#ffffff] rounded-lg bg-primary-button hover:bg-secondary hover:text-white h-[34px] whitespace-nowrap w-full`}
          >
            {saving
              ? t("chat_window.workspace_llm_manager.saving")
              : t("chat_window.workspace_llm_manager.save")}
          </button>
        )}
      </div>
    </div>
  );
}

