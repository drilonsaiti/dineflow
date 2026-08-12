export default function VenueWithoutTablePage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
            <p className="text-lg font-medium">Scan the QR code on your table to order.</p>
            <p className="mt-2 text-sm text-gray-500">This menu is only available per-table.</p>
        </div>
    );
}