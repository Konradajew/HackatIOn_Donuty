import HealIcon from "@/assets/icons/heal.svg";
import { BaseCard } from "./base-card";

export const HealCard = () => {
  return <BaseCard type="HEAL" centerIcon={HealIcon} mainColor="#42EADD" />;
};
