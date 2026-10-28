// __tests__/components/MailAccountsPanel.test.tsx

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MailAccountsPanel from "@/components/mail/MailAccountsPanel";

describe("MailAccountsPanel", () => {
  it("oferuje podłączenie Gmaila i Outlooka osobnymi przyciskami", () => {
    const onConnectGmail = vi.fn();
    const onConnectOutlook = vi.fn();
    render(
      <MailAccountsPanel
        accounts={[]}
        selectedId={null}
        onSelect={vi.fn()}
        onConnectGmail={onConnectGmail}
        onConnectOutlook={onConnectOutlook}
        onDisconnect={vi.fn()}
        busy={false}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Podłącz konto Gmail" }));
    fireEvent.click(screen.getByRole("button", { name: "Podłącz konto Outlook" }));
    expect(onConnectGmail).toHaveBeenCalledTimes(1);
    expect(onConnectOutlook).toHaveBeenCalledTimes(1);
  });
});
