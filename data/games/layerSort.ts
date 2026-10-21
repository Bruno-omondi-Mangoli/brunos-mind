export type Owner = "you" | "microsoft";

export type Duty = { id: string; text: string; owner: Owner; why: string };

export type Round = { id: string; model: string; blurb: string; duties: Duty[] };

export const LAYER_SORT: Round[] = [
  {
    id: "iaas",
    model: "IaaS",
    blurb: "Matatu analogy: you rent an empty matatu and run it yourself.",
    duties: [
      { id: "data", text: "Your data and information", owner: "you", why: "Data is always the customer responsibility, in every model." },
      { id: "accounts", text: "Who has an account and who can sign in", owner: "you", why: "Accounts and identities are always the customer responsibility." },
      { id: "devices", text: "The phones and laptops used to connect", owner: "you", why: "Devices are always the customer responsibility." },
      { id: "os", text: "Patching the operating system of your virtual machine", owner: "you", why: "In IaaS you manage the guest operating system, including updates." },
      { id: "code", text: "The code of the app you deploy", owner: "you", why: "You bring and manage your own applications." },
      { id: "hosts", text: "The physical servers that run your virtual machine", owner: "microsoft", why: "Physical hosts are always the provider responsibility in the cloud." },
      { id: "datacenter", text: "Power, cooling and the datacenter building", owner: "microsoft", why: "The physical datacenter is always the provider responsibility." },
    ],
  },
  {
    id: "paas",
    model: "PaaS",
    blurb: "Matatu analogy: you join a sacco route, the sacco keeps the vehicle ready.",
    duties: [
      { id: "data", text: "Your data and information", owner: "you", why: "Data is always the customer responsibility." },
      { id: "accounts", text: "Who has an account and who can sign in", owner: "you", why: "Accounts and identities are always the customer responsibility." },
      { id: "devices", text: "The phones and laptops used to connect", owner: "you", why: "Devices are always the customer responsibility." },
      { id: "os", text: "Patching the operating system under your app", owner: "microsoft", why: "In PaaS the provider manages the operating system and platform." },
      { id: "code", text: "The code of the app you deploy", owner: "you", why: "You still build and manage your own application." },
      { id: "hosts", text: "The physical servers behind the platform", owner: "microsoft", why: "Physical hosts are always the provider responsibility." },
      { id: "network", text: "The physical network cables and switches", owner: "microsoft", why: "The physical network is always the provider responsibility." },
    ],
  },
  {
    id: "saas",
    model: "SaaS",
    blurb: "Matatu analogy: you board a matatu, pay the fare and ride.",
    duties: [
      { id: "data", text: "Your data and information", owner: "you", why: "Data is always the customer responsibility." },
      { id: "accounts", text: "Who has an account and who can sign in", owner: "you", why: "Accounts and identities are always the customer responsibility." },
      { id: "devices", text: "The phones and laptops used to connect", owner: "you", why: "Devices are always the customer responsibility." },
      { id: "os", text: "Patching the operating system on the servers", owner: "microsoft", why: "In SaaS the provider runs everything under the application." },
      { id: "app", text: "Building and updating the software itself", owner: "microsoft", why: "In SaaS the provider manages the whole application." },
      { id: "datacenter", text: "Power, cooling and the datacenter building", owner: "microsoft", why: "The physical datacenter is always the provider responsibility." },
    ],
  },
];