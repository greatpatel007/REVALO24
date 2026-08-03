import { useState } from "react";
import { FileZip } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useApi } from "@/shared/lib/useApi";
import { getFtpCredentials, getImportJobs, uploadImportZip } from "@/features/agent/api";
import { GateNotice, useAgentGate } from "@/features/agent/gate";
import { fmtDateTime } from "@/shared/lib/format";
import { StatusBadge, Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { ErrorState } from "@/shared/ui/ErrorState";
import { Skeleton } from "@/shared/ui/Skeleton";
import { useToast } from "@/shared/ui/Toast";

/* Smart Property Import & Multiparsing Router (§3.4.3 / §4.6).
   One unified "Upload Property via CRM" flow regardless of CRM source. */
export function CrmImport() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const jobs = useApi(getImportJobs);
  const ftp = useApi(getFtpCredentials);
  const { approved } = useAgentGate();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const upload = () => {
    setUploading(true);
    void uploadImportZip(file?.name ?? "manual_upload.zip")
      .then(() => {
        toast(t("agent.crm.queued"), "info");
        setFile(null);
        jobs.reload();
      })
      .catch(() => toast(t("agent.crm.uploadFail"), "error"))
      .finally(() => setUploading(false));
  };

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-extrabold">{t("agent.nav.import")}</h1>
      <p className="mb-6 text-sm text-muted">{t("agent.crm.sub")}</p>

      {/* Verification Gate — imports publish inventory */}
      <GateNotice className="mb-6" />

      {/* Upload dominates; SFTP credentials are a fixed-width reference rail */}
      <div className="mb-6 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* Unified upload */}
        <section className="rounded-xl border border-slate-300 bg-white p-5">
          <h2 className="mb-1 font-display text-base font-bold">{t("agent.crm.uploadTitle")}</h2>
          <p className="mb-4 text-sm text-muted">{t("agent.crm.uploadSub")}</p>
          <label className="mb-4 flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-slate-400 bg-canvas p-8 text-center transition-colors hover:border-action hover:bg-blue-50/40">
            <input
              type="file"
              accept=".zip,application/zip"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <FileZip className="mb-2 size-8 text-muted" aria-hidden />
            <p className="text-sm font-semibold">{file ? file.name : t("agent.crm.drop")}</p>
            <p className="text-xs text-muted">{t("agent.crm.ops")}</p>
          </label>
          <Button className="w-full" loading={uploading} disabled={!file || !approved}
            title={!approved ? t("agent.gate.incomplete") : undefined} onClick={upload}>{t("agent.crm.uploadCta")}</Button>
        </section>

        {/* SFTP credentials */}
        <section className="rounded-xl border border-slate-300 bg-white p-5">
          <h2 className="mb-1 font-display text-base font-bold">{t("agent.crm.sftpTitle")}</h2>
          <p className="mb-4 text-sm text-muted">{t("agent.crm.sftpSub")}</p>
          {ftp.data ? (
            <dl className="space-y-2.5 font-mono text-sm">
              {[
                [t("agent.crm.host"), ftp.data.host],
                [t("agent.crm.port"), String(ftp.data.port)],
                [t("agent.crm.user"), ftp.data.username],
                [t("agent.crm.protocol"), `${ftp.data.protocol} (chroot jail)`],
                [t("agent.crm.dir"), ftp.data.directory],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 rounded-lg bg-canvas px-3.5 py-2">
                  <dt className="font-sans font-semibold text-muted">{k}</dt>
                  <dd className="truncate font-bold" title={v}>{v}</dd>
                </div>
              ))}
            </dl>
          ) : ftp.error ? (
            <ErrorState onRetry={ftp.reload} />
          ) : <Skeleton className="h-40 w-full" />}
          <p className="mt-3 text-xs text-muted">{t("agent.crm.pwNote")}</p>
        </section>
      </div>

      {jobs.loading && <Skeleton className="h-52 w-full rounded-xl" />}
      {!jobs.loading && jobs.error && <ErrorState onRetry={jobs.reload} />}

      {!jobs.loading && !jobs.error && (
      <>
      {/* Import history — stacked cards on mobile, table from md up */}
      <section className="rounded-xl border border-slate-300 bg-white md:hidden">
        <h2 className="border-b border-slate-200 px-4 py-4 font-display text-base font-bold">{t("agent.crm.historyTitle")}</h2>
        <ul className="divide-y divide-slate-200">
          {(jobs.data ?? []).map((j) => (
            <li key={j.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 flex-1 truncate text-sm font-semibold" title={j.fileName}>{j.fileName}</p>
                <StatusBadge status={j.status} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
                <Badge tone="neutral">{j.source}</Badge>
                <span className="font-mono font-bold text-slate-800">{j.operation}</span>
                <span className="tabular">{t("agent.crm.objectsLine", { n: j.propertiesProcessed })}</span>
                <span>{fmtDateTime(j.createdAt, locale)}</span>
              </div>
              {j.errors.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs text-err-700">
                  {j.errors.map((e) => <li key={e}>· {e}</li>)}
                </ul>
              )}
              {j.status === "failed" && (
                <button type="button" onClick={() => toast(t("agent.crm.retried"), "info")}
                  className="mt-2 cursor-pointer text-xs font-bold text-blue-700 hover:underline">{t("agent.crm.retry")}</button>
              )}
            </li>
          ))}
          {jobs.data && jobs.data.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-muted">{t("agent.crm.empty")}</li>
          )}
        </ul>
      </section>

      <section className="hidden overflow-x-auto rounded-xl border border-slate-300 bg-white scrollbar-thin md:block">
        <h2 className="border-b border-slate-200 px-5 py-4 font-display text-base font-bold">{t("agent.crm.historyTitle")}</h2>
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left">
              {[t("agent.crm.thFile"), t("agent.crm.thSource"), t("agent.crm.thOp"), t("agent.list.thStatus"), t("agent.crm.thObjects"), t("agent.crm.thDate")].map((h) => (
                <th key={h} className="px-5 py-2.5 font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {(jobs.data ?? []).map((j) => (
              <tr key={j.id} className="align-top hover:bg-canvas">
                <td className="px-5 py-3">
                  <p className="font-semibold">{j.fileName}</p>
                  {j.errors.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-xs text-err-700">
                      {j.errors.map((e) => <li key={e}>· {e}</li>)}
                    </ul>
                  )}
                </td>
                <td className="px-5 py-3"><Badge tone="neutral">{j.source}</Badge></td>
                <td className="px-5 py-3 font-mono text-xs font-bold">{j.operation}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={j.status} />
                  {j.status === "failed" && (
                    <button type="button" onClick={() => toast(t("agent.crm.retried"), "info")}
                      className="ml-2 cursor-pointer text-xs font-bold text-blue-700 hover:underline">{t("agent.crm.retry")}</button>
                  )}
                </td>
                <td className="px-5 py-3 tabular">{j.propertiesProcessed}</td>
                <td className="whitespace-nowrap px-5 py-3 text-muted">{fmtDateTime(j.createdAt, locale)}</td>
              </tr>
            ))}
            {jobs.data && jobs.data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted">
                  {t("agent.crm.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
      </>
      )}

      <p className="mt-4 text-xs text-muted">{t("agent.crm.note")}</p>
    </div>
  );
}
