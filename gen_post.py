import os
import calendar
import datetime

BASE_DIR = "posts"


def get_day_name(year, month, day):
    return datetime.date(year, month, day).strftime("%A")


def create_folders_for_month(year, month):
    # Ensure base directory exists
    if not os.path.exists(BASE_DIR):
        os.makedirs(BASE_DIR)

    # Create Year directory
    year_dir = os.path.join(BASE_DIR, str(year))

    # Create Month directory
    month_dir = os.path.join(year_dir, f"{month:02d}")

    num_days = calendar.monthrange(year, month)[1]

    print(f"Generating folders for {year}-{month:02d}...")

    for day in range(1, num_days + 1):
        day_name = get_day_name(year, month, day)
        # Format: 01-Monday
        folder_name = f"{day:02d}-{day_name}"
        day_path = os.path.join(month_dir, folder_name)

        try:
            os.makedirs(day_path, exist_ok=True)
            # Create a placeholder file so git recognizes the folder (optional)
            # User might want to add markdown files manually, but let's add a .gitkeep
            with open(os.path.join(day_path, ".gitkeep"), 'w') as f:
                pass
            print(f"  Created: {day_path}")
        except OSError as e:
            print(f"  Error creating {day_path}: {e}")


def create_folders_for_year(year):
    print(f"Generating folders for Year {year}...")
    for month in range(1, 13):
        create_folders_for_month(year, month)


if __name__ == "__main__":
    print("Folder Generation Tool")
    print("======================")
    print("1. Generate for a full year")
    print("2. Generate for a specific month")

    try:
        choice = input("Enter choice (1 or 2): ").strip()

        if choice == '1':
            year_input = input("Enter year (YYYY): ").strip()
            if year_input.isdigit():
                create_folders_for_year(int(year_input))
            else:
                print("Invalid year format.")

        elif choice == '2':
            year_input = input("Enter year (YYYY): ").strip()
            month_input = input("Enter month (1-12): ").strip()

            if year_input.isdigit() and month_input.isdigit():
                year = int(year_input)
                month = int(month_input)
                if 1 <= month <= 12:
                    create_folders_for_month(year, month)
                else:
                    print("Month must be between 1 and 12.")
            else:
                print("Invalid input format.")
        else:
            print("Invalid choice.")

    except KeyboardInterrupt:
        print("\nOperation cancelled.")
    except Exception as e:
        print(f"\nAn error occurred: {e}")

