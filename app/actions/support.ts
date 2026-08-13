"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/services/audit";
import { requireUser } from "@/services/session";
import {
  createSupportTicket,
  listSupportTickets,
  type CreateSupportTicketInput,
} from "@/services/support";

export async function listSupportTicketsAction() {
  const user = requireUser();
  return listSupportTickets(user);
}

export async function createSupportTicketAction(input: CreateSupportTicketInput) {
  const user = requireUser();
  const ticket = await createSupportTicket(user, input);
  void audit({ action: "support_ticket.created", entity_type: "support_ticket", entity_id: ticket.id, metadata: { category: ticket.category } });
  revalidatePath("/support");
  return ticket;
}
