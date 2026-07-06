import SwiftUI

struct PrepView: View {
    private let parking = parkingLocations
    private let resupply = resupplyTowns
    private let transit = transitRoutes

    var body: some View {
        NavigationStack {
            ZStack {
                Color(uiColor: .systemGroupedBackground).ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 32) {
                        
                        // Action Required Section
                        VStack(alignment: .leading, spacing: 12) {
                            SectionHeader(title: "Critical Path", icon: "exclamationmark.triangle.fill", color: .orange)
                            PrepTaskCard(title: "PCT Long-Distance Permit", subtitle: "PCTA — Apply early", icon: "doc.plaintext.fill")
                            PrepTaskCard(title: "Burney Falls Day Use", subtitle: "$10/vehicle", icon: "car.fill")
                            PrepTaskCard(title: "Campfire Permit", subtitle: "CAL FIRE — Free", icon: "flame.fill")
                        }
                        
                        // Pre-Trip Checklist
                        VStack(alignment: .leading, spacing: 12) {
                            SectionHeader(title: "Pre-Flight Checklist", icon: "checklist", color: .blue)
                            PrepTaskCard(title: "Water filter serviced", subtitle: "Sawyer Squeeze backflush", icon: "drop.fill")
                            PrepTaskCard(title: "Bear canister packed", subtitle: "Required in wilderness areas", icon: "lock.shield.fill")
                            PrepTaskCard(title: "Emergency contacts shared", subtitle: "InReach share link to family", icon: "antenna.radiowaves.left.and.right")
                            PrepTaskCard(title: "Weather forecast checked", subtitle: "48hr before departure", icon: "cloud.sun.fill")
                            PrepTaskCard(title: "Offline maps downloaded", subtitle: "Apple Maps or Gaia GPS", icon: "map.fill")
                        }
                        
                        // Resupply Points
                        VStack(alignment: .leading, spacing: 12) {
                            SectionHeader(title: "Resupply Depots", icon: "shippingbox.fill", color: .green)
                            ForEach(resupply) { town in
                                InfoCard(
                                    title: "\(town.town) Resupply",
                                    subtitle: town.services.joined(separator: " · "),
                                    notes: town.notes,
                                    icon: "cart.fill"
                                )
                            }
                        }
                        
                        // Logistics (Parking & Transit)
                        VStack(alignment: .leading, spacing: 12) {
                            SectionHeader(title: "Extraction & Insertion", icon: "car.fill", color: .purple)
                            
                            DriveTrackerView()
                            
                            ForEach(parking) { lot in
                                InfoCard(
                                    title: "Parking: \(lot.location)",
                                    subtitle: "\(lot.cost) · \(lot.address)",
                                    notes: lot.notes,
                                    icon: "parkingsign.circle.fill"
                                )
                            }
                        }
                    }
                    .padding()
                    .padding(.bottom, 40)
                }
            }
            .navigationTitle("Mission Prep")
        }
    }
}

// MARK: - Section Header

struct SectionHeader: View {
    let title: String
    let icon: String
    let color: Color
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundStyle(color)
            Text(title)
                .font(.title3.bold())
        }
        .padding(.bottom, 4)
    }
}

// MARK: - Prep Task Card

struct PrepTaskCard: View {
    let title: String
    let subtitle: String
    let icon: String?
    @State private var isChecked = false

    var body: some View {
        Button {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                isChecked.toggle()
            }
        } label: {
            HStack(spacing: 16) {
                // Check circle
                ZStack {
                    Circle()
                        .strokeBorder(isChecked ? .green : .gray.opacity(0.4), lineWidth: 2)
                        .frame(width: 28, height: 28)
                    
                    if isChecked {
                        Circle()
                            .fill(.green)
                            .frame(width: 20, height: 20)
                        Image(systemName: "checkmark")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(.white)
                    }
                }
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.headline)
                        .strikethrough(isChecked)
                        .foregroundStyle(isChecked ? .secondary : .primary)
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                
                Spacer()
                
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.title3)
                        .foregroundStyle(isChecked ? AnyShapeStyle(.green.opacity(0.5)) : AnyShapeStyle(.tertiary))
                }
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(isChecked ? Color.green.opacity(0.05) : Color(uiColor: .secondarySystemGroupedBackground))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(isChecked ? .green.opacity(0.3) : .gray.opacity(0.2), lineWidth: 1)
            )
            .scaleEffect(isChecked ? 0.98 : 1.0)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Info Card

struct InfoCard: View {
    let title: String
    let subtitle: String
    let notes: String
    let icon: String
    
    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(.purple)
                .frame(width: 28)
                .padding(.top, 2)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                Text(subtitle)
                    .font(.caption.bold())
                    .foregroundStyle(.secondary)
                if !notes.isEmpty {
                    Text(notes)
                        .font(.caption2)
                        .foregroundStyle(.orange)
                        .padding(.top, 2)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(.gray.opacity(0.2), lineWidth: 1))
    }
}

#Preview {
    PrepView()
}
