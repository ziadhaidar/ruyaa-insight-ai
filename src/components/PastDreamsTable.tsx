
import React from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";
import { useDream } from "@/context/DreamContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

const PastDreamsTable: React.FC = () => {
  const { t } = useLanguage();
  const { dreams, getMessages } = useDream();
  const navigate = useNavigate();

  if (!dreams.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("pastDreams")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            {t("noHistoryYet")}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort dreams by creation date (newest first)
  const sortedDreams = [...dreams].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("pastDreams")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Dream</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedDreams.map((dream) => {
              const messages = getMessages(dream.id);
              
              return (
                <TableRow key={dream.id}>
                  <TableCell>
                    {format(new Date(dream.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {dream.content}
                  </TableCell>
                  <TableCell>
                    <span className={`capitalize ${dream.status === "completed" ? "text-green-600" : "text-amber-600"}`}>
                      {dream.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {dream.status === "completed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/dreams/${dream.id}`)}
                      >
                        View
                      </Button>
                    )}
                    {dream.status === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/payment")}
                      >
                        Pay
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default PastDreamsTable;
