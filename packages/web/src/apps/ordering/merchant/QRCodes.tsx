import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { QrCode, Printer } from 'lucide-react';
import { useTenant } from '@web/platform/tenant/TenantProvider';
import { Card, CardContent, Input, Button } from '@web/components/ui';

export function QRCodes() {
  const { tenantSlug } = useTenant();
  const [tableCount, setTableCount] = useState(10);
  const [qrCodes, setQrCodes] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    let cancelled = false;

    async function generate() {
      const codes = new Map<number, string>();
      for (let i = 1; i <= tableCount; i++) {
        const url = `${window.location.origin}${import.meta.env.BASE_URL}order/${tenantSlug}?table=${i}`;
        const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 1 });
        codes.set(i, dataUrl);
      }
      if (!cancelled) {
        setQrCodes(codes);
      }
    }

    generate();

    return () => {
      cancelled = true;
    };
  }, [tableCount, tenantSlug]);

  const handleTableCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1 && value <= 100) {
      setTableCount(value);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          /* Hide everything except the QR grid */
          nav, header, aside, [data-platform-shell],
          .print\\:hidden {
            display: none !important;
          }

          /* Make body and main full width */
          body, main, #root {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }

          /* Grid layout for print */
          .qr-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 1.5rem !important;
            padding: 1rem !important;
          }

          .qr-card {
            break-inside: avoid;
            border: 1px solid #e5e7eb !important;
            border-radius: 0.5rem !important;
            padding: 1rem !important;
            text-align: center !important;
          }

          .qr-card img {
            margin: 0 auto !important;
          }
        }
      `}</style>

      <div className="space-y-6">
        {/* Header section - hidden when printing */}
        <div className="print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-text">QR Codes</h1>
              <p className="text-sm text-text-secondary mt-1">
                Generate QR codes for your restaurant tables
              </p>
            </div>

            <div className="flex items-end gap-3">
              <div className="w-32">
                <Input
                  label="Tables"
                  type="number"
                  min={1}
                  max={100}
                  value={tableCount}
                  onChange={handleTableCountChange}
                />
              </div>
              <Button variant="secondary" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
                Print All
              </Button>
            </div>
          </div>
        </div>

        {/* QR code grid */}
        <div className="qr-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: tableCount }, (_, i) => i + 1).map((tableNum) => {
            const dataUrl = qrCodes.get(tableNum);
            const url = `${window.location.origin}${import.meta.env.BASE_URL}order/${tenantSlug}?table=${tableNum}`;

            return (
              <Card key={tableNum} className="qr-card">
                <CardContent className="flex flex-col items-center gap-3 py-5">
                  <p className="text-lg font-semibold text-text">
                    Table {tableNum}
                  </p>

                  {dataUrl ? (
                    <img
                      src={dataUrl}
                      alt={`QR code for table ${tableNum}`}
                      className="w-full max-w-[200px] aspect-square"
                    />
                  ) : (
                    <div className="w-full max-w-[200px] aspect-square flex items-center justify-center bg-bg-muted rounded">
                      <QrCode className="h-8 w-8 text-text-tertiary animate-pulse" />
                    </div>
                  )}

                  <p className="text-xs text-text-tertiary break-all text-center max-w-[200px]">
                    {url}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
