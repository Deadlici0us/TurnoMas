/**
 * Puerto IBackgroundJobs (PLAN.md 2.1): QStash en Vercel, fake en memoria
 * para tests y modo demo local.
 */

import { readEnv } from "@/lib/env/env";

export interface ScheduleJobInput
{
  readonly url: string;
  readonly delaySeconds: number;
  readonly body: unknown;
}

export interface IBackgroundJobs
{
  schedule(input: ScheduleJobInput): Promise<string>;
}

/** Doble de test en memoria: registra tareas sin red. */
export class FakeBackgroundJobs implements IBackgroundJobs
{
  readonly scheduled: ScheduleJobInput[] = [];
  private counter = 0;

  async schedule(input: ScheduleJobInput): Promise<string>
  {
    this.counter += 1;
    this.scheduled.push(input);

    return `fake-job-${this.counter}`;
  }
}

/** Adaptador QStash vía REST: publica con retardo usando QSTASH_TOKEN. */
export class QStashAdapter implements IBackgroundJobs
{
  async schedule(input: ScheduleJobInput): Promise<string>
  {
    const baseUrl = readEnv("QSTASH_URL");
    const token = readEnv("QSTASH_TOKEN");

    if (baseUrl === null || token === null)
    {
      throw new Error("Falta configurar QSTASH_URL o QSTASH_TOKEN en el entorno.");
    }

    const cleanBase = baseUrl.replace(/^["']+|["']+$/g, "").replace(/\/+$/, "");
    const endpoint = `${cleanBase}/v2/publish/${input.url}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Upstash-Delay": `${input.delaySeconds}s`,
      },
      body: JSON.stringify(input.body ?? {}),
    });

    if (!response.ok)
    {
      throw new Error("No se pudo programar la tarea en segundo plano.");
    }

    const data = (await response.json()) as { messageId?: string };

    return data.messageId ?? "qstash-sin-id";
  }
}
