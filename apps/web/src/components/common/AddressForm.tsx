"use client";

// Provides a reusable address form block for checkout or profile flows.
import { useState } from "react";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";

export type AddressValue = {
  recipient: string;
  phone: string;
  postalCode: string;
  address1: string;
  address2: string;
};

type AddressFormProps = {
  defaultValue?: Partial<AddressValue>;
  submitLabel?: string;
  onSubmit?: (value: AddressValue) => void;
};

const emptyAddress: AddressValue = {
  recipient: "",
  phone: "",
  postalCode: "",
  address1: "",
  address2: "",
};

export function AddressForm({ defaultValue, submitLabel = "주소 저장", onSubmit }: AddressFormProps) {
  const [value, setValue] = useState<AddressValue>({ ...emptyAddress, ...defaultValue });

  function updateField(field: keyof AddressValue, nextValue: string) {
    setValue((current) => ({ ...current, [field]: nextValue }));
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.(value);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="받는 사람" value={value.recipient} onChange={(event) => updateField("recipient", event.target.value)} />
        <Input label="연락처" value={value.phone} onChange={(event) => updateField("phone", event.target.value)} />
      </div>
      <Input label="우편번호" value={value.postalCode} onChange={(event) => updateField("postalCode", event.target.value)} />
      <Input label="주소" value={value.address1} onChange={(event) => updateField("address1", event.target.value)} />
      <Input label="상세 주소" value={value.address2} onChange={(event) => updateField("address2", event.target.value)} />
      <Button className="w-full sm:w-auto" type="submit">
        {submitLabel}
      </Button>
    </form>
  );
}
