"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Bungee, Space_Grotesk } from "next/font/google";

const bungee = Bungee({
  weight: "400",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

type Person = {
  id: number;
  name: string;
};

type Item = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  sharedBy: string[];
};

type SummaryPerson = {
  name: string;
  total: number;
  paid: number;
  balance: number;
};

type Settlement = {
  from: string;
  to: string;
  amount: number;
};

type BillResponse = {
  message: string;
  billId: number;
  accessCode: string;
};

type PersonResponse = {
  message: string;
  name: string;
  personId: number;
};

type ItemResponse = {
  message: string;
  item: string;
  price: number;
  quantity?: number;
  itemId: number;
};

type ActionResponse = {
  message: string;
};

type SummaryResponse = {
  billId: number;
  people: SummaryPerson[];
};

type SettlementResponse = {
  message: string;
  transactions: Settlement[];
};

type LoadBillResponse = {
  billId: number;
  tax: number;
  tip: number;
  people: {
    id: number;
    name: string;
    paid: number;
    finalTotal: number;
    balance: number;
  }[];
  items: {
    id: number;
    name: string;
    price: number;
    quantity?: number;
    sharedBy: string[];
  }[];
};

const CURRENCIES = [
  { code: "GBP", name: "British Pound (£)" },
  { code: "USD", name: "US Dollar ($)" },
  { code: "EUR", name: "Euro (€)" },
  { code: "INR", name: "Indian Rupee (₹)" },
  { code: "PKR", name: "Pakistani Rupee (Rs)" },
  { code: "SAR", name: "Saudi Riyal (SAR)" },
  { code: "AED", name: "UAE Dirham (AED)" },
];

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

export default function Home() {
  const [billName, setBillName] = useState("");
  const [billId, setBillId] = useState<number | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [currency, setCurrency] = useState("GBP");

  const accessCodeRef = useRef<HTMLInputElement>(null);
  const itemPriceRef = useRef<HTMLInputElement>(null);
  const itemQuantityRef = useRef<HTMLInputElement>(null);
  const tipInputRef = useRef<HTMLInputElement>(null);

  const [loadBillId, setLoadBillId] = useState("");
  const [loadAccessCode, setLoadAccessCode] = useState("");

  const [people, setPeople] = useState<Person[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  const [personName, setPersonName] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemQuantity, setItemQuantity] = useState("");

  const [editingPersonId, setEditingPersonId] = useState<number | null>(null);
  const [editingPersonName, setEditingPersonName] = useState("");
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingItemName, setEditingItemName] = useState("");
  const [editingItemPrice, setEditingItemPrice] = useState("");
  const [editingItemQuantity, setEditingItemQuantity] = useState("");

  const [tax, setTax] = useState("");
  const [tip, setTip] = useState("");

  const [loadedTax, setLoadedTax] = useState(0);
  const [loadedTip, setLoadedTip] = useState(0);

  const [summary, setSummary] = useState<SummaryPerson[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [settlementCalculated, setSettlementCalculated] =
    useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);

  const [currentShareIndex, setCurrentShareIndex] = useState(0);
  const [selectedSharePeople, setSelectedSharePeople] = useState<
    string[]
  >([]);
  const [sharedItems, setSharedItems] = useState<string[]>([]);
  const [sharingComplete, setSharingComplete] = useState(false);
  const [sharingLoading, setSharingLoading] = useState(false);

  const [currentPaymentIndex, setCurrentPaymentIndex] = useState(0);
  const [paymentAmounts, setPaymentAmounts] = useState<
    Record<string, string>
  >({});
  const [paymentsComplete, setPaymentsComplete] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  function showMessage(text: string) {
    setMessage(text);
    setError("");
  }

  function showError(text: string) {
    setError(text);
    setMessage("");
  }

  function clearCalculatedResults() {
    setSummary([]);
    setSettlements([]);
    setSettlementCalculated(false);
  }

  async function apiRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(accessCode
          ? { "X-Bill-Access-Code": accessCode }
          : {}),
        ...(options.headers || {}),
      },
    });

    const text = await response.text();

    let data;

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text };
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          "Something went wrong."
      );
    }

    if (options.method && options.method !== "GET") {
      clearCalculatedResults();
    }

    return data;
  }

  function goToStep(step: number) {
    setCurrentStep(step);
    setMessage("");
    setError("");

    if (step === 6) {
      clearCalculatedResults();
      void loadSummary();
    }

    if (step === 7) {
      clearCalculatedResults();
      void calculateSettlement();
    }
  }

  async function createBill() {
    if (!billName.trim()) {
      showError("Please enter a bill name.");
      return;
    }

    try {
      setLoading(true);

      const data: BillResponse = await apiRequest("/bill", {
        method: "POST",
      });

      setBillId(data.billId);
      setAccessCode(data.accessCode);

      setPeople([]);
      setItems([]);

      setSummary([]);
      setSettlements([]);
      setSettlementCalculated(false);

      setLoadedTax(0);
      setLoadedTip(0);

      setTax("");
      setTip("");

      setCurrentShareIndex(0);
      setSelectedSharePeople([]);
      setSharedItems([]);
      setSharingComplete(false);

      setCurrentPaymentIndex(0);
      setPaymentAmounts({});
      setPaymentsComplete(false);

      setCurrentStep(2);

      setTimeout(() => {
        document.getElementById("person-name-input")?.focus();
      }, 100);

      showMessage(
        `"${billName.trim()}" created successfully.`
      );
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Failed to create bill."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadPreviousBill() {
    const id = Number(loadBillId);

    if (!loadBillId || Number.isNaN(id) || id <= 0) {
      showError("Please enter a valid bill ID.");
      return;
    }

    if (!loadAccessCode.trim()) {
      showError("Please enter the bill access code.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_URL}/bill/load?billId=${id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Bill-Access-Code": loadAccessCode.trim(),
          },
        }
      );

      const text = await response.text();

      let data;

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: text };
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Failed to load previous bill."
        );
      }

      const bill: LoadBillResponse = data;

      setBillId(bill.billId);
      setAccessCode(loadAccessCode.trim());

      setPeople(
        bill.people.map((person) => ({
          id: person.id,
          name: person.name,
        }))
      );

      setItems(
        bill.items.map((item) => ({
          id: item.id,
          name: item.name,
          price: Number(item.price),
          quantity: Number(item.quantity || 1),
          sharedBy: item.sharedBy || [],
        }))
      );

      setLoadedTax(Number(bill.tax || 0));
      setLoadedTip(Number(bill.tip || 0));

      setTax("");
      setTip("");

      const loadedPayments: Record<string, string> = {};

      for (const person of bill.people) {
        loadedPayments[person.name] = String(
          Number(person.paid || 0)
        );
      }

      setPaymentAmounts(loadedPayments);

      setCurrentShareIndex(0);

      if (bill.items.length > 0) {
        setSelectedSharePeople(
          bill.items[0].sharedBy || []
        );
      } else {
        setSelectedSharePeople([]);
      }

      setSharedItems(
        bill.items
          .filter(
            (item) =>
              item.sharedBy &&
              item.sharedBy.length > 0
          )
          .map((item) => item.name)
      );

      setSharingComplete(
        bill.items.length > 0 &&
          bill.items.every(
            (item) =>
              item.sharedBy &&
              item.sharedBy.length > 0
          )
      );

      setCurrentPaymentIndex(0);
      setPaymentsComplete(false);

      setSummary([]);
      setSettlements([]);
      setSettlementCalculated(false);

      setCurrentStep(2);

      showMessage(
        `Bill #${bill.billId} loaded successfully.`
      );
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Failed to load previous bill."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handlePersonEnter() {
    await addPerson();
}

  async function addPerson(): Promise<boolean> {
    if (!billId) {
      showError("Please create a bill first.");
      return false;
    }

    if (!personName.trim()) {
      showError("Please enter a person's name.");
      return false;
    }

    try {
      setLoading(true);

      const data: PersonResponse = await apiRequest("/person", {
        method: "POST",
        body: JSON.stringify({
          name: personName.trim(),
          billId,
        }),
      });

      setPeople((current) => [
        ...current,
        {
          id: data.personId,
          name: data.name,
        },
      ]);

      setPersonName("");

      showMessage(`${data.name} added.`);
      return true;
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Failed to add person."
      );
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleItemEnter() {
    const added = await addItem();

    if (added) {
      setTimeout(() => {
        document.getElementById("item-name-input")?.focus();
      }, 0);
    }
  }

  async function addItem(): Promise<boolean> {
    if (!billId) {
      showError("Please create a bill first.");
      return false;
    }

    if (!itemName.trim()) {
      showError("Please enter an item name.");
      return false;
    }

    const price = Number(itemPrice);
    const quantity =
      itemQuantity.trim() === ""
        ? 1
        : Number(itemQuantity);

    if (!itemPrice || Number.isNaN(price) || price <= 0) {
      showError(
        "Please enter a valid price greater than 0."
      );
      return false;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      showError("Please enter a valid quantity greater than 0.");
      return false;
    }

    try {
      setLoading(true);

      const data: ItemResponse = await apiRequest("/item", {
        method: "POST",
        body: JSON.stringify({
          itemname: itemName.trim(),
          price,
          quantity,
          billId,
        }),
      });

      setItems((current) => [
        ...current,
        {
          id: data.itemId,
          name: data.item,
          price: Number(data.price),
          quantity: Number(data.quantity || quantity),
          sharedBy: [],
        },
      ]);

      setItemName("");
      setItemPrice("");
      setItemQuantity("");
      setSharingComplete(false);

      showMessage(`${data.item} added.`);
      return true;
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Failed to add item."
      );
      return false;
    } finally {
      setLoading(false);
    }
  }

  function startEditingPerson(person: Person) {
    setEditingPersonId(person.id);
    setEditingPersonName(person.name);
  }

  function cancelEditingPerson() {
    setEditingPersonId(null);
    setEditingPersonName("");
  }

  async function savePersonEdit(person: Person) {
    if (!billId) {
      showError("Please create a bill first.");
      return;
    }

    if (!editingPersonName.trim()) {
      showError("Please enter a person's name.");
      return;
    }

    try {
      setLoading(true);

      const data: PersonResponse = await apiRequest("/person", {
        method: "PUT",
        body: JSON.stringify({
          personId: person.id,
          name: editingPersonName.trim(),
          billId,
        }),
      });

      setPeople((current) =>
        current.map((currentPerson) =>
          currentPerson.id === person.id
            ? { ...currentPerson, name: data.name }
            : currentPerson
        )
      );

      setItems((current) =>
        current.map((item) => ({
          ...item,
          sharedBy: item.sharedBy.map((name) =>
            name === person.name ? data.name : name
          ),
        }))
      );

      if (paymentAmounts[person.name] !== undefined) {
        setPaymentAmounts((current) => {
          const next = { ...current };
          next[data.name] = next[person.name];
          delete next[person.name];
          return next;
        });
      }

      cancelEditingPerson();
      showMessage(`${data.name} updated.`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to update person.");
    } finally {
      setLoading(false);
    }
  }

  async function deletePerson(person: Person) {
    if (!billId) {
      showError("Please create a bill first.");
      return;
    }

    if (!window.confirm(`Delete ${person.name}?`)) {
      return;
    }

    try {
      setLoading(true);

      await apiRequest("/person", {
        method: "DELETE",
        body: JSON.stringify({
          personId: person.id,
          billId,
        }),
      });

      setPeople((current) =>
        current.filter((currentPerson) => currentPerson.id !== person.id)
      );

      setItems((current) =>
        current.map((item) => ({
          ...item,
          sharedBy: item.sharedBy.filter((name) => name !== person.name),
        }))
      );

      setPaymentAmounts((current) => {
        const next = { ...current };
        delete next[person.name];
        return next;
      });

      if (editingPersonId === person.id) {
        cancelEditingPerson();
      }

      setSharingComplete(false);
      setPaymentsComplete(false);
      showMessage(`${person.name} deleted.`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to delete person.");
    } finally {
      setLoading(false);
    }
  }

  function startEditingItem(item: Item) {
    setEditingItemId(item.id);
    setEditingItemName(item.name);
    setEditingItemPrice(String(item.price));
    setEditingItemQuantity(String(item.quantity));
  }

  function cancelEditingItem() {
    setEditingItemId(null);
    setEditingItemName("");
    setEditingItemPrice("");
    setEditingItemQuantity("");
  }

  async function saveItemEdit(item: Item) {
    if (!billId) {
      showError("Please create a bill first.");
      return;
    }

    const price = Number(editingItemPrice);
    const quantity = Number(editingItemQuantity);

    if (!editingItemName.trim()) {
      showError("Please enter an item name.");
      return;
    }

    if (Number.isNaN(price) || price <= 0) {
      showError("Please enter a valid price greater than 0.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      showError("Please enter a valid quantity greater than 0.");
      return;
    }

    try {
      setLoading(true);

      const data: ItemResponse = await apiRequest("/item", {
        method: "PUT",
        body: JSON.stringify({
          itemId: item.id,
          itemname: editingItemName.trim(),
          price,
          quantity,
          billId,
        }),
      });

      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? {
                ...currentItem,
                name: data.item,
                price: Number(data.price),
                quantity: Number(data.quantity || quantity),
              }
            : currentItem
        )
      );

      cancelEditingItem();
      setSharingComplete(false);
      showMessage(`${data.item} updated.`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to update item.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteItem(item: Item) {
    if (!billId) {
      showError("Please create a bill first.");
      return;
    }

    if (!window.confirm(`Delete ${item.name}?`)) {
      return;
    }

    try {
      setLoading(true);

      await apiRequest("/item", {
        method: "DELETE",
        body: JSON.stringify({
          itemId: item.id,
          billId,
        }),
      });

      setItems((current) =>
        current.filter((currentItem) => currentItem.id !== item.id)
      );

      setCurrentShareIndex((current) => Math.max(0, Math.min(current, items.length - 2)));
      setSelectedSharePeople([]);
      setSharingComplete(false);

      if (editingItemId === item.id) {
        cancelEditingItem();
      }

      showMessage(`${item.name} deleted.`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to delete item.");
    } finally {
      setLoading(false);
    }
  }

  function toggleSharePerson(name: string) {
    setSelectedSharePeople((current) =>
      current.includes(name)
        ? current.filter((person) => person !== name)
        : [...current, name]
    );
  }

  async function saveCurrentSharing() {
    if (!billId) {
      showError("Please create a bill first.");
      return;
    }

    const item = items[currentShareIndex];

    if (!item) {
      return;
    }

    if (selectedSharePeople.length === 0) {
      showError(
        `Please select at least one person for "${item.name}".`
      );
      return;
    }

    try {
      setSharingLoading(true);

      for (const name of selectedSharePeople) {
        if (!item.sharedBy.includes(name)) {
          await apiRequest("/shareItem", {
            method: "POST",
            body: JSON.stringify({
              personName: name,
              itemId: item.id,
              billId,
            }),
          });
        }
      }

      for (const name of item.sharedBy) {
        if (!selectedSharePeople.includes(name)) {
          await apiRequest("/unshareItem", {
            method: "POST",
            body: JSON.stringify({
              personName: name,
              itemId: item.id,
              billId,
            }),
          });
        }
      }

      setItems((current) =>
        current.map((currentItem, index) =>
          index === currentShareIndex
            ? {
                ...currentItem,
                sharedBy: selectedSharePeople,
              }
            : currentItem
        )
      );

      setSharedItems((current) =>
        current.includes(item.name)
          ? current
          : [...current, item.name]
      );

      if (currentShareIndex < items.length - 1) {
        const nextIndex = currentShareIndex + 1;
        setCurrentShareIndex(nextIndex);
        setSelectedSharePeople(items[nextIndex].sharedBy || []);
        showMessage(`${item.name} saved. Next item.`);
      } else {
        setSharingComplete(true);
        showMessage("All items have been shared.");
      }
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Failed to update item sharing."
      );
    } finally {
      setSharingLoading(false);
    }
  }

  function hasUnsharedItems() {
    return items.some(
      (item) => item.sharedBy.length === 0
    );
  }

  function continueToTaxTip() {
    const unsharedItem = items.find(
      (item) => item.sharedBy.length === 0
    );

    if (unsharedItem) {
      showError(
        `Please select at least one person for "${unsharedItem.name}" before continuing.`
      );
      return;
    }

    setSharingComplete(true);
    goToStep(4);
  }

  function handleSharingEnter() {
    if (selectedSharePeople.length === 0) {
      continueToTaxTip();
    } else {
      void saveCurrentSharing();
    }
  }

  function restartSharing() {
    setCurrentShareIndex(0);

    if (items.length > 0) {
      setSelectedSharePeople(
        items[0].sharedBy || []
      );
    } else {
      setSelectedSharePeople([]);
    }

    setSharedItems(
      items
        .filter(
          (item) =>
            item.sharedBy &&
            item.sharedBy.length > 0
        )
        .map((item) => item.name)
    );

    setSharingComplete(false);
  }

  async function addTax(): Promise<boolean> {
    if (!billId) {
      showError("Please create a bill first.");
      return false;
    }

    const amount = Number(tax);

    if (Number.isNaN(amount) || amount < 0) {
      showError("Please enter a valid tax amount.");
      return false;
    }

    try {
      setLoading(true);

      await apiRequest("/tax", {
        method: "POST",
        body: JSON.stringify({
          tax: amount,
          billId,
        }),
      });

      setLoadedTax(amount);
      setTax("");

      showMessage(`${formatMoney(amount, currency)} tax set.`);
      return true;
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Failed to add tax."
      );
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleTaxEnter() {
    const added = await addTax();

    if (added) {
      setTimeout(() => {
        tipInputRef.current?.focus();
      }, 0);
    }
  }

  async function handleTipEnter() {
    const added = await addTip();

    if (added) {
      goToStep(5);
    }
  }

  async function addTip(): Promise<boolean> {
    if (!billId) {
      showError("Please create a bill first.");
      return false;
    }

    const amount = Number(tip);

    if (Number.isNaN(amount) || amount < 0) {
      showError("Please enter a valid tip amount.");
      return false;
    }

    try {
      setLoading(true);

      await apiRequest("/tip", {
        method: "POST",
        body: JSON.stringify({
          tip: amount,
          billId,
        }),
      });

      setLoadedTip(amount);
      setTip("");

      showMessage(`${formatMoney(amount, currency)} tip set.`);
      return true;
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Failed to add tip."
      );
      return false;
    } finally {
      setLoading(false);
    }
  }

  function updatePaymentAmount(amount: string) {
    const person = people[currentPaymentIndex];

    if (!person) {
      return;
    }

    setPaymentAmounts((current) => ({
      ...current,
      [person.name]: amount,
    }));
  }

  async function saveCurrentPayment() {
    if (!billId) {
      showError("Please create a bill first.");
      return;
    }

    const person = people[currentPaymentIndex];

    if (!person) {
      return;
    }

    const amountText = paymentAmounts[person.name] || "";
    const amount = Number(amountText);

    if (
      amountText === "" ||
      Number.isNaN(amount) ||
      amount < 0
    ) {
      showError("Please enter a valid payment amount.");
      return;
    }

    try {
      setPaymentLoading(true);

      await apiRequest("/paid", {
        method: "POST",
        body: JSON.stringify({
          name: person.name,
          paid: amount,
          billId,
        }),
      });

      if (currentPaymentIndex < people.length - 1) {
        setCurrentPaymentIndex((current) => current + 1);

        showMessage(`${person.name}'s payment saved.`);
      } else {
        setPaymentsComplete(true);
        setCurrentPaymentIndex(0);
        showMessage("All payments have been recorded.");
      }
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Failed to save payment."
      );
    } finally {
      setPaymentLoading(false);
    }
  }

  async function loadSummary() {
    if (!billId) {
      showError("Please create a bill first.");
      return;
    }

    try {
      setLoading(true);

      const data: SummaryResponse = await apiRequest(
        `/summary?billId=${billId}`
      );

      setSummary(data.people);

      showMessage("Summary calculated.");
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Failed to calculate summary."
      );
    } finally {
      setLoading(false);
    }
  }

  async function calculateSettlement() {
    if (!billId) {
      showError("Please create a bill first.");
      return;
    }

    try {
      setLoading(true);

      const data: SettlementResponse =
        await apiRequest("/settlement", {
          method: "POST",
          body: JSON.stringify({
            billId,
          }),
        });

      setSettlements(data.transactions);
      setSettlementCalculated(true);

      showMessage("Settlement calculated.");
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Failed to calculate settlement."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleEnter(
    event: KeyboardEvent<HTMLInputElement>,
    action: () => void
  ) {
    if (event.key === "Enter") {
      action();
    }
  }

  const currentShareItem = items[currentShareIndex];
  const currentPaymentPerson =
    people[currentPaymentIndex];

  const totalSummaryBill = summary.reduce(
    (sum, person) => sum + Number(person.total),
    0
  );

  const totalSummaryPaid = summary.reduce(
    (sum, person) => sum + Number(person.paid),
    0
  );

  const totalItemAmount = items.reduce(
    (sum, item) =>
      sum + Number(item.price) * Number(item.quantity || 1),
    0
  );

  const currentTotalAmount =
    totalItemAmount + loadedTax + loadedTip;

  const totalSummaryBalance =
    totalSummaryBill - totalSummaryPaid;

  return (
    <main
      className={`${spaceGrotesk.className} min-h-screen bg-[#030303] text-white`}
    >
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 64 64"
                  role="img"
                  aria-label="SmartSplit"
                >
                  <rect width="64" height="64" rx="12" fill="#ffffff" />
                  <path
                    d="M15 8 H49 V57 L44.5 52 L40 57 L35.5 52 L31 57 L26.5 52 L22 57 L17.5 52 L15 57 Z"
                    fill="#000000"
                  />
                  <rect x="21" y="15" width="22" height="4" fill="#ffffff" />
                  <rect x="21" y="24" width="22" height="4" fill="#ffffff" />
                  <rect x="21" y="33" width="14" height="4" fill="#ffffff" />
                  <rect x="21" y="42" width="22" height="4" fill="#ffffff" />
                </svg>

                <span
                  className={`${bungee.className} text-sm tracking-wider text-white`}
                >
                  SMARTSPLIT
                </span>
              </div>

              <h1
                className={`${bungee.className} max-w-3xl text-4xl leading-[1.05] tracking-tight sm:text-6xl`}
              >
                SPLIT THE BILL.
                <br />
                <span className="text-[#666]">
                  WITHOUT THE HEADACHE.
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-sm leading-6 text-[#777]">
                Add everyone, assign items, record payments
                and let SmartSplit work out who owes what.
              </p>
            </div>

            {billId && (
              <div className="border-2 border-white bg-white px-5 py-3 text-black">
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                  BILL
                </span>

                <span
                  className={`${bungee.className} ml-3 text-xl`}
                >
                  #{billId}
                </span>
              </div>
            )}
          </div>
        </header>

        {message && (
          <div className="mb-5 border border-white bg-white px-4 py-3 text-sm font-bold text-black">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 border border-white bg-[#111] px-4 py-3 text-sm font-bold text-white">
            {error}
          </div>
        )}

        {billId && (
          <div className="mb-6 border-2 border-white bg-[#080808] p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[9px] font-black tracking-[0.25em] text-[#555]">
                  BILL ID
                </p>

                <p
                  className={`${bungee.className} mt-2 text-2xl`}
                >
                  #{billId}
                </p>
              </div>

              <div>
                <p className="text-[9px] font-black tracking-[0.25em] text-[#555]">
                  ACCESS CODE
                </p>

                <p
                  className={`${bungee.className} mt-2 break-all text-2xl`}
                >
                  {accessCode}
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs text-[#666]">
              Save these details if you want to load this bill
              again later.
            </p>
          </div>
        )}

        <section className="mb-6 border-2 border-white bg-[#080808] p-6 sm:p-8">
          <div className="mb-6">
            <div className="mb-3">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#777]">
                CREATE / LOAD
              </span>
            </div>

            <h2
              className={`${bungee.className} text-2xl sm:text-3xl`}
            >
              START A BILL
            </h2>

            <p className="mt-2 text-sm text-[#666]">
              Create a new bill or load an existing one.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={billName}
              onChange={(event) =>
                setBillName(event.target.value)
              }
              onKeyDown={(event) =>
                handleEnter(event, createBill)
              }
              placeholder="e.g. DINNER AT PIZZA EXPRESS"
              className="min-w-0 flex-1 border-2 border-[#333] bg-black px-4 py-4 text-sm font-bold uppercase outline-none transition placeholder:text-[#444] focus:border-white"
            />

            <select
              value={currency}
              onChange={(event) =>
                setCurrency(event.target.value)
              }
              className="border-2 border-[#333] bg-black px-4 py-4 text-sm font-bold uppercase outline-none focus:border-white sm:w-56"
            >
              {CURRENCIES.map((option) => (
                <option
                  key={option.code}
                  value={option.code}
                  className="bg-black text-white"
                >
                  {option.name}
                </option>
              ))}
            </select>

            <button
              onClick={createBill}
              disabled={loading}
              className={`${bungee.className} bg-white px-7 py-4 text-xs text-black transition hover:bg-[#ccc] disabled:opacity-40`}
            >
              {loading ? "CREATING..." : "CREATE BILL"}
            </button>
          </div>

          <div className="mt-6 border-t border-[#222] pt-6">
            <p className="mb-4 text-[9px] font-black tracking-[0.25em] text-[#555]">
              PREVIOUS BILL
            </p>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={loadBillId}
                onChange={(event) =>
                  setLoadBillId(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    accessCodeRef.current?.focus();
                  }
                }}
                placeholder="BILL ID"
                type="number"
                min="1"
                className="w-full border-2 border-[#333] bg-black px-4 py-4 text-sm font-bold outline-none placeholder:text-[#444] focus:border-white sm:w-32"
              />

              <input
                value={loadAccessCode}
                onChange={(event) =>
                  setLoadAccessCode(event.target.value)
                }
                onKeyDown={(event) =>
                  handleEnter(event, loadPreviousBill)
                }
                ref={accessCodeRef}
                placeholder="ACCESS CODE"
                className="min-w-0 flex-1 border-2 border-[#333] bg-black px-4 py-4 text-sm font-bold uppercase outline-none placeholder:text-[#444] focus:border-white"
              />

              <button
                onClick={loadPreviousBill}
                disabled={loading}
                className={`${bungee.className} bg-white px-7 py-4 text-xs text-black transition hover:bg-[#ccc] disabled:opacity-40`}
              >
                {loading ? "LOADING..." : "LOAD BILL"}
              </button>
            </div>
          </div>
        </section>

        {billId && (
          <>
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["TOTAL", formatMoney(currentTotalAmount, currency)],
                ["PEOPLE", people.length],
                ["ITEMS", items.length],
                ["BILL", `#${billId}`],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="border border-[#333] bg-[#080808] p-5"
                >
                  <p className="text-[9px] font-black tracking-[0.25em] text-[#555]">
                    {label}
                  </p>

                  <p
                    className={`${bungee.className} mt-2 break-all text-xl`}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-6">
              {[
                ["PEOPLE", 2],
                ["SHARING", 3],
                ["TAX & TIP", 4],
                ["PAYMENTS", 5],
                ["SUMMARY", 6],
                ["SETTLEMENT", 7],
              ].map(([label, step]) => (
                <button
                  key={String(step)}
                  onClick={() => {
                    const targetStep = Number(step);

                    if (targetStep > 3 && hasUnsharedItems()) {
                      showError(
                        "Please share all items before continuing."
                      );
                      setCurrentStep(3);
                      return;
                    }

                    goToStep(targetStep);
                  }}
                  className={`border px-3 py-3 text-left transition ${
                    currentStep === Number(step)
                      ? "border-white bg-white text-black"
                      : "border-[#333] bg-[#080808] text-[#555] hover:border-[#777] hover:text-white"
                  }`}
                >
                  <p className="text-[8px] font-black tracking-[0.15em]">
                    {label}
                  </p>
                </button>
              ))}
            </div>

            {currentStep === 2 && (
              <section
                className="mb-6 grid gap-6 lg:grid-cols-2"
                onKeyDown={(event) => {
                  if (event.key !== "Enter") {
                    return;
                  }

                  const target = event.target as HTMLElement;

                  if (
                    target.tagName === "BUTTON" ||
                    target.tagName === "SELECT"
                  ) {
                    return;
                  }

                  if (
                    people.length > 0 &&
                    items.length > 0 &&
                    personName.trim() === "" &&
                    itemName.trim() === "" &&
                    itemPrice.trim() === "" &&
                    itemQuantity.trim() === ""
                  ) {
                    event.preventDefault();
                    goToStep(3);
                  }
                }}
              >
                <div className="border border-[#333] bg-[#080808] p-6 sm:p-7">
                  <div className="mb-6">
                    <div className="mb-3">

                      <span className="text-[10px] font-black tracking-[0.25em] text-[#555]">
                        PEOPLE
                      </span>
                    </div>

                    <h3
                      className={`${bungee.className} text-2xl`}
                    >
                      WHO&apos;S EATING?
                    </h3>
                  </div>

                  <div className="flex gap-2">
                    <input
                      id="person-name-input"
                      value={personName}
                      onChange={(event) =>
                        setPersonName(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void handlePersonEnter();
                        }
                      }}
                      placeholder="NAME"
                      className="min-w-0 flex-1 border-2 border-[#333] bg-black px-4 py-3 text-sm font-bold uppercase outline-none placeholder:text-[#444] focus:border-white"
                    />

                    <button
                      onClick={addPerson}
                      disabled={loading}
                      className={`${bungee.className} bg-white px-5 text-xs text-black transition hover:bg-[#ccc] disabled:opacity-40`}
                    >
                      ADD
                    </button>
                  </div>

                  {people.length > 0 && (
                    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {people.map((person) => (
                        <div
                          key={person.id}
                          className="border border-[#222] bg-black px-4 py-4"
                        >
                          {editingPersonId === person.id ? (
                            <>
                              <input
                                value={editingPersonName}
                                onChange={(event) =>
                                  setEditingPersonName(event.target.value)
                                }
                                className="mt-2 w-full border border-[#333] bg-black px-2 py-2 text-sm font-bold uppercase outline-none focus:border-white"
                              />

                              <div className="mt-3 flex gap-2">
                                <button
                                  onClick={() => void savePersonEdit(person)}
                                  disabled={loading}
                                  className={`${bungee.className} bg-white px-3 py-2 text-[9px] text-black disabled:opacity-40`}
                                >
                                  SAVE
                                </button>
                                <button
                                  onClick={cancelEditingPerson}
                                  className={`${bungee.className} border border-[#444] px-3 py-2 text-[9px] text-white`}
                                >
                                  CANCEL
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="mt-2 break-words font-bold uppercase">
                                {person.name}
                              </p>

                              <div className="mt-3 flex gap-2">
                                <button
                                  onClick={() => startEditingPerson(person)}
                                  className="border border-[#333] px-3 py-2 text-[9px] font-black text-[#aaa] hover:border-white hover:text-white"
                                >
                                  EDIT
                                </button>
                                <button
                                  onClick={() => void deletePerson(person)}
                                  className="border border-[#333] px-3 py-2 text-[9px] font-black text-[#aaa] hover:border-white hover:text-white"
                                >
                                  DELETE
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border border-[#333] bg-[#080808] p-6 sm:p-7">
                  <div className="mb-6">
                    <div className="mb-3">

                      <span className="text-[10px] font-black tracking-[0.25em] text-[#555]">
                        ITEMS
                      </span>
                    </div>

                    <h3
                      className={`${bungee.className} text-2xl`}
                    >
                      WHAT DID YOU BUY?
                    </h3>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      id="item-name-input"
                      value={itemName}
                      onChange={(event) =>
                        setItemName(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          itemPriceRef.current?.focus();
                        }
                      }}
                      placeholder="ITEM"
                      className="min-w-0 flex-1 border-2 border-[#333] bg-black px-4 py-3 text-sm font-bold uppercase outline-none placeholder:text-[#444] focus:border-white"
                    />

                    <input
                      value={itemPrice}
                      onChange={(event) =>
                        setItemPrice(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();

                          if (
                            people.length > 0 &&
                            items.length > 0 &&
                            itemName.trim() === "" &&
                            itemPrice.trim() === "" &&
                            itemQuantity.trim() === ""
                          ) {
                            goToStep(3);
                            return;
                          }

                          itemQuantityRef.current?.focus();
                        }
                      }}
                      ref={itemPriceRef}
                      placeholder="PRICE"
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full border-2 border-[#333] bg-black px-4 py-3 text-sm font-bold outline-none placeholder:text-[#444] focus:border-white sm:w-28"
                    />

                    <input
                      value={itemQuantity}
                      onChange={(event) =>
                        setItemQuantity(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void handleItemEnter();
                        }
                      }}
                      ref={itemQuantityRef}
                      placeholder="QTY"
                      type="number"
                      min="1"
                      step="1"
                      className="w-full border-2 border-[#333] bg-black px-4 py-3 text-sm font-bold outline-none placeholder:text-[#444] focus:border-white sm:w-24"
                    />

                    <button
                      onClick={addItem}
                      disabled={loading}
                      className={`${bungee.className} bg-white px-5 text-xs text-black transition hover:bg-[#ccc] disabled:opacity-40`}
                    >
                      ADD
                    </button>
                  </div>

                  {items.length > 0 && (
                    <div className="mt-5 space-y-2">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="border border-[#222] bg-black px-4 py-3"
                        >
                          {editingItemId === item.id ? (
                            <div className="grid gap-2 sm:grid-cols-[1fr_110px_90px_auto] sm:items-center">
                              <input
                                value={editingItemName}
                                onChange={(event) =>
                                  setEditingItemName(event.target.value)
                                }
                                className="border border-[#333] bg-black px-3 py-2 text-sm font-bold uppercase outline-none focus:border-white"
                                placeholder="ITEM"
                              />
                              <input
                                value={editingItemPrice}
                                onChange={(event) =>
                                  setEditingItemPrice(event.target.value)
                                }
                                type="number"
                                min="0"
                                step="0.01"
                                className="border border-[#333] bg-black px-3 py-2 text-sm font-bold outline-none focus:border-white"
                                placeholder="PRICE"
                              />
                              <input
                                value={editingItemQuantity}
                                onChange={(event) =>
                                  setEditingItemQuantity(event.target.value)
                                }
                                type="number"
                                min="1"
                                step="1"
                                className="border border-[#333] bg-black px-3 py-2 text-sm font-bold outline-none focus:border-white"
                                placeholder="QTY"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => void saveItemEdit(item)}
                                  disabled={loading}
                                  className={`${bungee.className} bg-white px-3 py-2 text-[9px] text-black disabled:opacity-40`}
                                >
                                  SAVE
                                </button>
                                <button
                                  onClick={cancelEditingItem}
                                  className={`${bungee.className} border border-[#444] px-3 py-2 text-[9px] text-white`}
                                >
                                  CANCEL
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-4">
                                <div>
                                  <p className="font-bold uppercase">
                                    {item.name}
                                  </p>
                                  <p className="mt-1 text-[10px] font-bold uppercase text-[#555]">
                                    QTY {item.quantity}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span
                                  className={`${bungee.className} text-sm`}
                                >
                                  {formatMoney(item.price * item.quantity, currency)}
                                </span>
                                <button
                                  onClick={() => startEditingItem(item)}
                                  className="border border-[#333] px-3 py-2 text-[9px] font-black text-[#aaa] hover:border-white hover:text-white"
                                >
                                  EDIT
                                </button>
                                <button
                                  onClick={() => void deleteItem(item)}
                                  className="border border-[#333] px-3 py-2 text-[9px] font-black text-[#aaa] hover:border-white hover:text-white"
                                >
                                  DELETE
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end lg:col-span-2">
                  <button
                    onClick={() => goToStep(3)}
                    disabled={
                      people.length === 0 ||
                      items.length === 0
                    }
                    className={`${bungee.className} bg-white px-7 py-4 text-xs text-black transition hover:bg-[#ccc] disabled:opacity-30`}
                  >
                    CONTINUE TO SHARING
                  </button>
                </div>
              </section>
            )}

            {currentStep === 3 && (
              <section
                className="mb-6 border-2 border-white bg-[#080808] p-6 sm:p-8"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    const target = event.target as HTMLElement;

                    if (target.tagName === "BUTTON") {
                      return;
                    }

                    event.preventDefault();
                    handleSharingEnter();
                  }
                }}
                tabIndex={-1}
              >
                <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="mb-3">

                      <span className="text-[10px] font-black tracking-[0.25em] text-[#555]">
                        SHARING
                      </span>
                    </div>

                    <h3
                      className={`${bungee.className} text-2xl sm:text-3xl`}
                    >
                      WHO HAD EACH ITEM?
                    </h3>

                    <p className="mt-2 text-sm text-[#666]">
                      Select everyone who shared the current
                      item.
                    </p>
                  </div>

                  {items.length > 0 && (
                    <div
                      className={`${bungee.className} text-sm text-[#666]`}
                    >
                      {Math.min(
                        currentShareIndex + 1,
                        items.length
                      )}
                      {" / "}
                      {items.length}
                    </div>
                  )}
                </div>

                {people.length === 0 ||
                items.length === 0 ? (
                  <div className="border border-dashed border-[#333] p-8 text-center">
                    <p className="text-sm text-[#555]">
                      ADD PEOPLE AND ITEMS FIRST.
                    </p>
                  </div>
                ) : sharingComplete ? (
                  <div className="border border-white bg-white p-8 text-center text-black">
                    <div
                      className={`${bungee.className} text-3xl`}
                    >
                      ✓
                    </div>

                    <h4
                      className={`${bungee.className} mt-3 text-xl`}
                    >
                      ALL ITEMS SHARED
                    </h4>

                    <p className="mt-2 text-sm text-[#555]">
                      Every item has been assigned.
                    </p>

                    <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                      <button
                        onClick={restartSharing}
                        className={`${bungee.className} bg-black px-6 py-3 text-xs text-white`}
                      >
                        EDIT SHARING
                      </button>

                      <button
                        onClick={continueToTaxTip}
                        className={`${bungee.className} border-2 border-black bg-white px-6 py-3 text-xs text-black transition hover:bg-[#ddd]`}
                      >
                        CONTINUE TO TAX &amp; TIP
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {currentShareItem && (
                      <div className="mb-5 border border-white bg-white p-5 text-black">
                        <p className="text-[9px] font-black tracking-[0.25em] text-[#666]">
                          CURRENT ITEM
                        </p>

                        <div className="mt-3 flex items-center justify-between gap-4">
                          <h4
                            className={`${bungee.className} min-w-0 break-all text-right text-lg`}
                          >
                            {currentShareItem.name}
                          </h4>

                          <span
                            className={`${bungee.className} text-sm`}
                          >
                            {formatMoney(
                              currentShareItem.price,
                              currency
                            )} × {currentShareItem.quantity}
                            <span className="ml-2 text-[#777]">
                              ({formatMoney(
                                currentShareItem.price * currentShareItem.quantity,
                                currency
                              )})
                            </span>
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {people.map((person) => {
                        const selected =
                          selectedSharePeople.includes(
                            person.name
                          );

                        return (
                          <button
                            key={person.id}
                            onClick={() =>
                              toggleSharePerson(
                                person.name
                              )
                            }
                            className={`border-2 px-4 py-4 text-left transition ${
                              selected
                                ? "border-white bg-white text-black"
                                : "border-[#222] bg-black text-[#888] hover:border-[#666] hover:text-white"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-black uppercase">
                                {person.name}
                              </span>

                              <span
                                className={`flex h-5 w-5 items-center justify-center border text-xs ${
                                  selected
                                    ? "border-black"
                                    : "border-[#444]"
                                }`}
                              >
                                {selected ? "✓" : ""}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-between">
                      <button
                        onClick={() => goToStep(2)}
                        className={`${bungee.className} border border-[#333] px-6 py-4 text-xs text-white`}
                      >
                        BACK
                      </button>

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          onClick={saveCurrentSharing}
                          disabled={sharingLoading}
                          className={`${bungee.className} bg-white px-7 py-4 text-xs text-black transition hover:bg-[#ccc] disabled:opacity-40`}
                        >
                          {sharingLoading
                            ? "SAVING..."
                            : currentShareIndex <
                              items.length - 1
                            ? "NEXT ITEM"
                            : "FINISH SHARING"}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </section>
            )}

            {currentStep === 4 && (
              <section className="mb-6 border border-[#333] bg-[#080808] p-6 sm:p-7">
                <div className="mb-6">
                  <div className="mb-3">

                    <span className="text-[10px] font-black tracking-[0.25em] text-[#555]">
                      EXTRAS
                    </span>
                  </div>

                  <h3
                    className={`${bungee.className} text-2xl`}
                  >
                    TAX &amp; TIP
                  </h3>
                </div>

                {(loadedTax > 0 || loadedTip > 0) && (
                  <div className="mb-5 grid gap-3 sm:grid-cols-2">
                    {loadedTax > 0 && (
                      <div className="border border-[#222] bg-black px-4 py-3">
                        <p className="text-[9px] font-black tracking-[0.25em] text-[#555]">
                          CURRENT TAX
                        </p>

                        <p
                          className={`${bungee.className} mt-2 text-lg`}
                        >
                          {formatMoney(loadedTax, currency)}
                        </p>
                      </div>
                    )}

                    {loadedTip > 0 && (
                      <div className="border border-[#222] bg-black px-4 py-3">
                        <p className="text-[9px] font-black tracking-[0.25em] text-[#555]">
                          CURRENT TIP
                        </p>

                        <p
                          className={`${bungee.className} mt-2 text-lg`}
                        >
                          {formatMoney(loadedTip, currency)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[9px] font-black tracking-[0.25em] text-[#555]">
                      SET TAX
                    </label>

                    <div className="flex gap-2">
                      <input
                        value={tax}
                        onChange={(event) =>
                          setTax(event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleTaxEnter();
                          }
                        }}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="min-w-0 flex-1 border-2 border-[#333] bg-black px-4 py-3 text-sm font-bold outline-none placeholder:text-[#444] focus:border-white"
                      />

                      <button
                        onClick={addTax}
                        disabled={loading}
                        className={`${bungee.className} bg-white px-5 text-xs text-black`}
                      >
                        ADD
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[9px] font-black tracking-[0.25em] text-[#555]">
                      SET TIP
                    </label>

                    <div className="flex gap-2">
                      <input
                        value={tip}
                        onChange={(event) =>
                          setTip(event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleTipEnter();
                          }
                        }}
                        ref={tipInputRef}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="min-w-0 flex-1 border-2 border-[#333] bg-black px-4 py-3 text-sm font-bold outline-none placeholder:text-[#444] focus:border-white"
                      />

                      <button
                        onClick={addTip}
                        disabled={loading}
                        className={`${bungee.className} bg-white px-5 text-xs text-black`}
                      >
                        ADD
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-between gap-3">
                  <button
                    onClick={() => goToStep(3)}
                    className={`${bungee.className} border border-[#333] px-6 py-4 text-xs text-white`}
                  >
                    BACK
                  </button>

                  <button
                    onClick={() => goToStep(5)}
                    className={`${bungee.className} bg-white px-7 py-4 text-xs text-black`}
                  >
                    CONTINUE TO PAYMENTS
                  </button>
                </div>
              </section>
            )}

            {currentStep === 5 && (
              <section className="mb-6 border border-[#333] bg-[#080808] p-6 sm:p-7">
                <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="mb-3">

                      <span className="text-[10px] font-black tracking-[0.25em] text-[#555]">
                        PAYMENTS
                      </span>
                    </div>

                    <h3
                      className={`${bungee.className} text-2xl sm:text-3xl`}
                    >
                      WHO HAS PAID?
                    </h3>

                    <p className="mt-2 text-sm text-[#666]">
                      Enter how much each person has already
                      paid.
                    </p>
                  </div>

                  {people.length > 0 &&
                    !paymentsComplete && (
                      <div
                        className={`${bungee.className} text-sm text-[#666]`}
                      >
                        {Math.min(
                          currentPaymentIndex + 1,
                          people.length
                        )}
                        {" / "}
                        {people.length}
                      </div>
                    )}
                </div>

                {people.length === 0 ? (
                  <div className="border border-dashed border-[#333] p-8 text-center">
                    <p className="text-sm text-[#555]">
                      ADD PEOPLE FIRST.
                    </p>
                  </div>
                ) : paymentsComplete ? (
                  <div className="border border-white bg-white p-8 text-center text-black">
                    <div
                      className={`${bungee.className} text-3xl`}
                    >
                      ✓
                    </div>

                    <h4
                      className={`${bungee.className} mt-3 text-xl`}
                    >
                      ALL PAYMENTS RECORDED
                    </h4>

                    <p className="mt-2 text-sm text-[#555]">
                      Everyone&apos;s payment has been saved.
                    </p>

                    <button
                      onClick={() =>
                        setPaymentsComplete(false)
                      }
                      className={`${bungee.className} mt-6 bg-black px-6 py-3 text-xs text-white`}
                    >
                      EDIT PAYMENTS
                    </button>
                  </div>
                ) : (
                  currentPaymentPerson && (
                    <div className="mx-auto max-w-xl">
                      <div className="mb-5 border border-white bg-white p-6 text-center text-black">
                        <p className="text-[9px] font-black tracking-[0.25em] text-[#666]">
                          PAYMENT FROM
                        </p>

                        <h4
                          className={`${bungee.className} mt-3 text-2xl`}
                        >
                          {currentPaymentPerson.name}
                        </h4>
                      </div>

                      <label className="mb-2 block text-[9px] font-black tracking-[0.25em] text-[#555]">
                        AMOUNT PAID
                      </label>

                      <div className="flex gap-2">
                        <input
                          value={
                            paymentAmounts[
                              currentPaymentPerson.name
                            ] || ""
                          }
                          onChange={(event) =>
                            updatePaymentAmount(
                              event.target.value
                            )
                          }
                          onKeyDown={(event) =>
                            handleEnter(
                              event,
                              saveCurrentPayment
                            )
                          }
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="min-w-0 flex-1 border-2 border-[#333] bg-black px-4 py-4 text-lg font-bold outline-none placeholder:text-[#444] focus:border-white"
                          autoFocus
                        />

                        <button
                          onClick={saveCurrentPayment}
                          disabled={paymentLoading}
                          className={`${bungee.className} bg-white px-6 text-xs text-black disabled:opacity-40`}
                        >
                          {paymentLoading
                            ? "SAVING..."
                            : currentPaymentIndex <
                              people.length - 1
                            ? "NEXT"
                            : "FINISH"}
                        </button>
                      </div>
                    </div>
                  )
                )}

                <div className="mt-6 flex justify-between gap-3">
                  <button
                    onClick={() => goToStep(4)}
                    className={`${bungee.className} border border-[#333] px-6 py-4 text-xs text-white`}
                  >
                    BACK
                  </button>

                  {paymentsComplete && (
                    <button
                      onClick={() => {
                        setCurrentPaymentIndex(0);
                        goToStep(6);
                      }}
                      className={`${bungee.className} bg-white px-7 py-4 text-xs text-black`}
                    >
                      GO TO SUMMARY
                    </button>
                  )}
                </div>
              </section>
            )}

            {currentStep === 6 && (
              <section className="mb-6 border-2 border-white bg-[#050505] p-6 sm:p-8">
                <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="mb-3">

                      <span className="text-[10px] font-black tracking-[0.25em] text-[#555]">
                        SUMMARY
                      </span>
                    </div>

                    <h3
                      className={`${bungee.className} text-2xl sm:text-4xl`}
                    >
                      THE DAMAGE.
                    </h3>

                    <p className="mt-2 text-sm text-[#666]">
                      Here&apos;s where the bill stands.
                    </p>
                  </div>

                </div>

                {summary.length === 0 ? (
                  <div className="border border-dashed border-[#333] p-10 text-center">
                    <p className="text-sm text-[#555]">
                      LOADING SUMMARY...
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-6 grid gap-3 sm:grid-cols-3">
                      <div className="border border-[#333] bg-[#0b0b0b] p-6 sm:p-7">
                        <p className="text-[9px] font-black tracking-[0.25em] text-[#555]">
                          TOTAL BILL
                        </p>

                        <p
                          className={`${bungee.className} mt-4 break-all text-3xl sm:text-4xl`}
                        >
                          {formatMoney(
                            totalSummaryBill,
                            currency
                          )}
                        </p>
                      </div>

                      <div className="border border-white bg-white p-6 text-black sm:p-7">
                        <p className="text-[9px] font-black tracking-[0.25em] text-[#555]">
                          TOTAL PAID
                        </p>

                        <p
                          className={`${bungee.className} mt-4 break-all text-3xl sm:text-4xl`}
                        >
                          {formatMoney(
                            totalSummaryPaid,
                            currency
                          )}
                        </p>
                      </div>

                      <div
                        className={`border p-6 sm:p-7 ${
                          totalSummaryBalance > 0
                            ? "border-white bg-[#111]"
                            : totalSummaryBalance < 0
                            ? "border-white bg-white text-black"
                            : "border-[#333] bg-[#0b0b0b]"
                        }`}
                      >
                        <p className="text-[9px] font-black tracking-[0.25em] text-[#555]">
                          BALANCE
                        </p>

                        <p
                          className={`${bungee.className} mt-4 break-all text-3xl sm:text-4xl`}
                        >
                          {formatMoney(
                            Math.abs(totalSummaryBalance),
                            currency
                          )}
                        </p>

                        <p className="mt-3 text-xs font-black uppercase tracking-wider text-[#666]">
                          {totalSummaryBalance > 0
                            ? "STILL UNPAID"
                            : totalSummaryBalance < 0
                            ? "OVERPAID"
                            : "FULLY PAID"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="mb-4">
                        <p className="text-[9px] font-black tracking-[0.25em] text-[#555]">
                          INDIVIDUAL BREAKDOWN
                        </p>

                        <h4
                          className={`${bungee.className} mt-2 text-xl`}
                        >
                          WHO OWES WHAT?
                        </h4>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {summary.map((person) => (
                          <div
                            key={person.name}
                            className="border border-[#333] bg-[#0b0b0b] p-5"
                          >
                            <p className="font-black uppercase">
                              {person.name}
                            </p>

                            <div className="mt-4 space-y-2">
                              <div className="flex min-w-0 justify-between gap-3 text-xs">
                                <span className="text-[#555]">
                                  OWES
                                </span>

                                <span className="min-w-0 break-all text-right font-bold">
                                  {formatMoney(
                                    Number(person.total),
                                    currency
                                  )}
                                </span>
                              </div>

                              <div className="flex min-w-0 justify-between gap-3 text-xs">
                                <span className="text-[#555]">
                                  PAID
                                </span>

                                <span className="min-w-0 break-all text-right font-bold">
                                  {formatMoney(
                                    Number(person.paid),
                                    currency
                                  )}
                                </span>
                              </div>

                              <div className="mt-3 border-t border-[#222] pt-3">
                                <div className="flex min-w-0 justify-between gap-3">
                                  <span className="text-[9px] font-black tracking-[0.2em] text-[#555]">
                                    BALANCE
                                  </span>

                                  <span
                                    className={`${bungee.className} min-w-0 break-all text-right text-lg`}
                                  >
                                    {formatMoney(
                                      Math.abs(Number(person.balance)),
                                      currency
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="mt-6 flex justify-between gap-3">
                  <button
                    onClick={() => goToStep(5)}
                    className={`${bungee.className} border border-[#333] px-6 py-4 text-xs text-white`}
                  >
                    BACK
                  </button>

                  <button
                    onClick={() => goToStep(7)}
                    className={`${bungee.className} bg-white px-7 py-4 text-xs text-black`}
                  >
                    GO TO SETTLEMENT
                  </button>
                </div>
              </section>
            )}

            {currentStep === 7 && (
              <section className="mb-6 border border-[#333] bg-[#080808] p-6 sm:p-8">
                <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="mb-3">

                      <span className="text-[10px] font-black tracking-[0.25em] text-[#555]">
                        SETTLEMENT
                      </span>
                    </div>

                    <h3
                      className={`${bungee.className} text-2xl sm:text-3xl`}
                    >
                      SETTLE THE BILL.
                    </h3>

                    <p className="mt-2 text-sm text-[#666]">
                      See exactly who needs to pay whom.
                    </p>
                  </div>

                </div>

                {!settlementCalculated ? (
                  <div className="border border-dashed border-[#333] p-10 text-center">
                    <p className="text-sm text-[#555]">
                      LOADING SETTLEMENT...
                    </p>
                  </div>
                ) : settlements.length === 0 ? (
                  <div className="border border-white bg-white p-8 text-center text-black">
                    <div
                      className={`${bungee.className} text-3xl`}
                    >
                      ✓
                    </div>

                    <p
                      className={`${bungee.className} mt-3 text-lg`}
                    >
                      EVERYONE IS SETTLED.
                    </p>

                    <p className="mt-2 text-sm text-[#555]">
                      No further payments are required.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {settlements.map(
                      (transaction, index) => (
                        <div
                          key={`${transaction.from}-${transaction.to}-${index}`}
                          className="flex flex-col gap-4 border border-[#222] bg-black p-5 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-black uppercase">
                              {transaction.from}
                            </p>

                            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-[#555]">
                              PAYS {transaction.to}
                            </p>
                          </div>

                          <div
                            className={`${bungee.className} text-xl`}
                          >
                            {formatMoney(
                              Number(transaction.amount),
                              currency
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}

                <div className="mt-6 flex justify-start">
                  <button
                    onClick={() => goToStep(6)}
                    className={`${bungee.className} border border-[#333] px-6 py-4 text-xs text-white`}
                  >
                    BACK TO SUMMARY
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        <footer className="py-10 text-center">
          <p
            className={`${bungee.className} text-xs tracking-wider text-[#333]`}
          >
            SMARTSPLIT
          </p>

          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#333]">
            SIMPLE BILL SPLITTING
          </p>
        </footer>
      </div>
    </main>
  );
}