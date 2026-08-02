$staffContent = Get-Content js/staff.js -Raw
# Strip out the appended duplicates in staff.js that start at "function openEditBookingModal" down to the end of the file.
# But ONLY the SECOND occurrence.
# Let's just find the index of the second occurrence.
$firstIndex = $staffContent.IndexOf("function openEditBookingModal")
$secondIndex = $staffContent.IndexOf("function openEditBookingModal", $firstIndex + 1)
if ($secondIndex -gt 0) {
    $staffContent = $staffContent.Substring(0, $secondIndex)
}

# Now let's fix the first occurrence of openEditBookingModal
$staffContent = $staffContent -replace 'const bk = DB\.bookings\.find\(b => b\.booking_id === bookingId\);', 'const bk = DB.bookings.find(b => b.booking_id === bookingId || b.id === bookingId);'
$staffContent = $staffContent -replace 'document\.getElementById\(''edit-bk-equipment-name''\)\.value = `\$\{bk\.equipment_name\} \(\{bk\.equipment_id\}\)`;', 'document.getElementById(''edit-bk-equipment-name'').value = bk.equipment_name ? `${bk.equipment_name} (${bk.equipment_id})` : bk.equipment.name;'
$staffContent = $staffContent -replace 'document\.getElementById\(''edit-booking-id''\)\.value = bk\.booking_id;', 'document.getElementById(''edit-booking-id'').value = bk.booking_id || bk.id;'

Set-Content js/staff.js -Value $staffContent -NoNewline
Write-Host "Fixed staff.js"

$adminContent = Get-Content js/admin.js -Raw

# Remove alert-banner-panel addition for failsafe
$adminContent = $adminContent -replace 'failsafePanel\.classList\.add\(''alert-banner-panel''\);', ''
$adminContent = $adminContent -replace 'else failsafePanel\.classList\.remove\(''alert-banner-panel''\);', ''

# Fix resolveTriageConflict to use appConfirm
$adminContent = $adminContent -replace 'const ok = window\.confirm\(', 'const ok = await appConfirm(''Confirm Triage Resolution'', '
$adminContent = $adminContent -replace '`Confirm Triage Resolution:\\n\\n.*?`', '`Booking ${winnerId} gets the original slot. Booking ${loserId} will be cascaded to the next available slot. Proceed?`, ''Confirm'''
# And replace the closing parenthesis of window.confirm
$adminContent = $adminContent -replace '(?s)const ok = await appConfirm\(''Confirm Triage Resolution'',\s*`.*?`,\s*''Confirm''\s*\);', 'const ok = await appConfirm(''Confirm Triage Resolution'', `Booking ${winnerId} gets the original slot. Booking ${loserId} will be cascaded to the next available slot. Proceed?`, ''Confirm'');'

Set-Content js/admin.js -Value $adminContent -NoNewline
Write-Host "Fixed admin.js"
