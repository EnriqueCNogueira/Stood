import type { Metadata } from "next";
import { PAGE_WIDTH } from "@/app/_components/ui";
import { DayDetail } from "@/app/_components/workspace/agenda/day-detail";
import { MonthGrid } from "@/app/_components/workspace/agenda/month-grid";
import { getAgendaMonth } from "@/lib/agenda/agenda";
import { buildTodayInBrasilia, isValidDay, isValidMonth } from "@/lib/agenda/rules";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Agenda · Stood" };

type AgendaPageProps = { searchParams: Promise<{ mes?: string | string[]; dia?: string | string[] }> };

// Agenda: o mês e o dia escolhido ficam no endereço, para recarregar sem perder a posição; sem eles, abre em hoje
export default async function AgendaPage({ searchParams }: AgendaPageProps) {
  const user = await requireSession();
  const params = await searchParams;
  const now = new Date();
  const today = buildTodayInBrasilia(now);
  const requestedDay = typeof params.dia === "string" && isValidDay(params.dia) ? params.dia : null;
  const requestedMonth = typeof params.mes === "string" && isValidMonth(params.mes) ? params.mes : null;
  const month = requestedMonth ?? requestedDay?.slice(0, 7) ?? today.slice(0, 7);
  const selectedDay = requestedDay?.startsWith(month) ? requestedDay : today.startsWith(month) ? today : `${month}-01`;
  const agenda = await getAgendaMonth(user.id, month, selectedDay, now);

  return (
    <main className={`mx-auto w-full px-4 pt-7 pb-16 md:px-12 md:pt-10 2xl:pt-14 ${PAGE_WIDTH}`}>
      <h1 className="mb-6 text-3xl font-medium tracking-tight 2xl:text-4xl">Agenda</h1>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <MonthGrid agenda={agenda} today={today} />
        <DayDetail agenda={agenda} />
      </div>
    </main>
  );
}
