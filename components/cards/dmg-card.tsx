import DmgIcon from "@/assets/icons/dmg.svg";
import { BaseCard } from "./base-card";

export const DmgCard = () => {
  return <BaseCard type="DAMAGE" centerIcon={DmgIcon} mainColor="#FF2A7A" />;
};
