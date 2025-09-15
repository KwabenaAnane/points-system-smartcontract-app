import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("PointsSystemModule", (m) => {
  
  const pointsSystem = m.contract("PointsSystem");

  return { pointsSystem };
});
