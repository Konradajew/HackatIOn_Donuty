import FiftyIcon from "@/assets/icons/50-50.svg";
import { BaseCard } from "./base-card";

export const FiftyFiftyCard = () => {
  return (
    <BaseCard
      type="50/50"
      topValue="1"
      centerIcon={FiftyIcon}
      category="HELP"
      mainColor="#9B5DE5"
    />
  );
};
