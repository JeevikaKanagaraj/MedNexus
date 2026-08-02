$content = Get-Content admin-dashboard.html -Raw
$parts = $content -split "(?s)\s*<!-- Overdue Panel -->"
$before = $parts[0]

$afterParts = $content -split "<!-- ALL CHECKOUTS TAB -->"
$after = "<!-- ALL CHECKOUTS TAB -->" + $afterParts[-1]

# Remove trailing overdue/failsafe fragments from $after
$after = $after -replace "(?s)<!-- Overdue Panel -->.*?</div>\s*</div>", ""
$after = $after -replace "(?s)<!-- Failsafe Panel -->.*?</div>\s*</div>", ""
$after = $after -replace "(?s)<!-- Overdue Panel -->[\s\S]*?</div>\s*</div>\s*<!-- Failsafe Panel -->[\s\S]*?</div>\s*</div>", ""


$panels = @"
                <!-- Overdue Panel -->
                <div class="card" id="overdue-panel" style="margin-top: 24px;">
                    <div class="card-header">
                        <span class="card-title">Critical Overdue Checkouts</span>
                        <span class="card-subtitle" style="color:var(--status-overdue);font-size:.75rem;">Items past due date - send alerts below</span>
                    </div>
                    <div class="card-body" id="overdue-panel-body">
                        <div class="empty-state">Loading...</div>
                    </div>
                </div>
                
                <!-- Failsafe Panel -->
                <div class="card" id="failsafe-panel" style="margin-top: 24px;">
                    <div class="card-header"><span class="card-title">Booking Failsafe Alerts</span></div>
                    <div class="card-body" id="failsafe-panel-body">
                        <div class="empty-state">Loading...</div>
                    </div>
                </div>
                </div> <!-- END TAB DASHBOARD -->
"@

Set-Content admin-dashboard.html -Value "$before`n$panels`n$after" -NoNewline
Write-Host "Fixed successfully."
