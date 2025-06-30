import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatCard } from "@/components/atoms";

interface Transaction {
  amount: string;
  recipient: string;
  gasFee: string;
  estimatedTime: string;
}

interface TransactionPreviewProps {
  transaction: Transaction;
  onConfirm: () => void;
  onCancel: () => void;
}

export const TransactionPreview = ({
  transaction,
  onConfirm,
  onCancel,
}: TransactionPreviewProps) => (
  <Card className="w-full max-w-md">
    <CardHeader>
      <CardTitle>Confirm Transaction</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <StatCard icon="💰" value={transaction.amount} label="Amount" />
        <StatCard icon="👤" value={transaction.recipient} label="To" />
        <StatCard icon="⛽" value={transaction.gasFee} label="Fee" />
        <StatCard icon="⏱️" value={transaction.estimatedTime} label="Time" />
      </div>

      <Separator />

      <div className="flex space-x-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button onClick={onConfirm} className="flex-1">
          Confirm
        </Button>
      </div>
    </CardContent>
  </Card>
);
