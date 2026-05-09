import TimeIcon from "@/assets/icons/time.svg";
import { BaseCard } from "./base-card";

export const TimeCard = () => {
  return (
    <BaseCard
      type="TIME"
      topValue="+10"
      centerIcon={TimeIcon}
      category="UTIL"
      mainColor="#FCA311"
    />
  );
};
