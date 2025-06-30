import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Token {
  symbol: string;
  balance: string;
  usdValue: number;
}

interface BalanceCardProps {
  chain: string;
  balance: string;
  usdValue: number;
  tokens?: Token[];
  className?: string;
}

export const BalanceCard = ({
  chain,
  balance,
  usdValue,
  tokens = [],
  className,
}: BalanceCardProps) => (
  <Card className={cn("", className)}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium capitalize">{chain}</CardTitle>
      <img src={`/chains/${chain}.svg`} alt={chain} className="h-6 w-6" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">${usdValue}</div>
      <p className="text-xs text-muted-foreground">
        {tokens.length} token{tokens.length !== 1 ? "s" : ""}
      </p>
    </CardContent>
  </Card>
);
