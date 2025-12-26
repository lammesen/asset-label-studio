import { Barcode, FileText, Minus, QrCode, Square, Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDesigner } from "./designer-context";

export function DesignerElementsPanel() {
  const { addField, addElement } = useDesigner();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Add Elements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={() => addField("text")}
          >
            <FileText className="h-4 w-4 mr-2" />
            Text
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={() => addField("qrcode")}
          >
            <QrCode className="h-4 w-4 mr-2" />
            QR
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={() => addField("barcode")}
          >
            <Barcode className="h-4 w-4 mr-2" />
            Barcode
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={() => addElement("text")}
          >
            <Tag className="h-4 w-4 mr-2" />
            Label
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={() => addElement("rect")}
          >
            <Square className="h-4 w-4 mr-2" />
            Box
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={() => addElement("line")}
          >
            <Minus className="h-4 w-4 mr-2" />
            Line
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
