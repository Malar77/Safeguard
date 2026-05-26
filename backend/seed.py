from database import SessionLocal, Helpline, LegalResource, CounselingResource, SafePlace, User, UserRole, ChildSafetyTip
from auth import hash_password


def seed():
    db = SessionLocal()

    # ─── Helplines ────────────────────────────────────────────────────────
    if db.query(Helpline).count() == 0:
        helplines = [
            Helpline(name="Women Helpline (National)", number="1091", category="women", description="24/7 emergency helpline for women in distress", available_24x7=True),
            Helpline(name="Domestic Violence Helpline", number="181", category="women", description="Support for victims of domestic violence", available_24x7=True),
            Helpline(name="Child Helpline (CHILDLINE)", number="1098", category="child", description="Emergency outreach for children in need", available_24x7=True),
            Helpline(name="Police Emergency", number="100", category="emergency", description="National police emergency number", available_24x7=True),
            Helpline(name="Ambulance", number="108", category="emergency", description="Medical emergency services", available_24x7=True),
            Helpline(name="National Emergency", number="112", category="emergency", description="Unified national emergency helpline", available_24x7=True),
            Helpline(name="Cyber Crime Helpline", number="1930", category="cyber", description="Report cybercrime, online harassment, digital fraud", available_24x7=True, website="https://cybercrime.gov.in"),
            Helpline(name="iCall (Counseling)", number="9152987821", category="counseling", description="Psychosocial helpline by TISS", available_24x7=False),
            Helpline(name="Vandrevala Foundation", number="1860-2662-345", category="counseling", description="Mental health support, 24/7", available_24x7=True),
            Helpline(name="Legal Aid Services Authority", number="15100", category="legal", description="Free legal aid and advice", available_24x7=False),
            Helpline(name="Anti-Human Trafficking Helpline", number="1800-419-8588", category="women", description="Report trafficking, get support", available_24x7=True),
            Helpline(name="NCW Helpline", number="7827170170", category="women", description="National Commission for Women helpline", available_24x7=True, website="https://ncw.nic.in"),
        ]
        db.add_all(helplines)

    # ─── Legal Resources ────────────────────────────────────────────────────────
    if db.query(LegalResource).count() == 0:
        legal = [
            LegalResource(title="Protection of Women from Domestic Violence Act, 2005", category="women", law_name="PWDVA 2005",
                summary="Provides for more effective protection of the rights of women guaranteed under the Constitution who are victims of violence of any kind occurring within the family.",
                full_text="The act covers physical, sexual, verbal, emotional and economic abuse. A woman can file a complaint before a Magistrate's court for a Protection Order, Residence Order, Monetary Relief, Custody Order, and Compensation Order.",
                reference_url="https://wcd.nic.in/act/protection-women-domestic-violence-act-2005"),
            LegalResource(title="Sexual Harassment of Women at Workplace Act, 2013", category="women", law_name="POSH Act 2013",
                summary="Every employer is required to constitute an Internal Complaints Committee (ICC). Every district has a Local Complaints Committee (LCC).",
                full_text="Defines sexual harassment, mandates formation of ICC, lays down complaint mechanism, ensures protection from retaliation, award of compensation, and penalties for non-compliance.",
                reference_url="https://wcd.nic.in/act/sexual-harassment-women-workplace-prevention-prohibition-and-redressal-act-2013"),
            LegalResource(title="Protection of Children from Sexual Offences (POCSO) Act, 2012", category="child", law_name="POCSO Act 2012",
                summary="Special law to protect children below 18 years from sexual abuse, harassment and exploitation.",
                full_text="Defines penetrative sexual assault, sexual assault, sexual harassment and pornography involving children. Establishes special courts for speedy trial. Mandatory reporting provisions for anyone aware of abuse.",
                reference_url="https://wcd.nic.in/pocso-act-2012"),
            LegalResource(title="The Dowry Prohibition Act, 1961", category="women", law_name="Dowry Prohibition Act",
                summary="Prohibits the giving or taking of dowry. Punishment: imprisonment up to 5 years and fine of Rs. 15,000 or the value of dowry.",
                reference_url="https://legislative.gov.in/sites/default/files/A1961-28.pdf"),
            LegalResource(title="Nirbhaya Act – Criminal Law Amendment Act, 2013", category="women", law_name="Criminal Law (Amendment) Act 2013",
                summary="Enacted after the 2012 Delhi gang-rape case. Expanded definition of rape, introduced new offences like stalking, acid attacks, voyeurism, disrobing.",
                full_text="Minimum sentence for rape is 7 years (up to life/death in aggravated cases). Acid attack: minimum 10 years. Stalking: 1-3 years imprisonment. New offences: voyeurism, disrobing.",
                reference_url="https://legislative.gov.in"),
            LegalResource(title="The Prohibition of Child Marriage Act, 2006", category="child", law_name="PCMA 2006",
                summary="Prohibits child marriages. A child marriage contracted in violation of this Act is voidable. Child: below 18 for girls, below 21 for boys.",
                reference_url="https://legislative.gov.in/sites/default/files/A2007-6.pdf"),
            LegalResource(title="Immoral Traffic (Prevention) Act, 1956", category="women", law_name="ITPA 1956",
                summary="Aims to prevent trafficking and sexual exploitation for commercial purposes.",
                reference_url="https://legislative.gov.in"),
            LegalResource(title="Right to Education Act, 2009 (for Girl Child)", category="child", law_name="RTE Act 2009",
                summary="Mandates free and compulsory education for all children aged 6–14. Special provisions to prevent discrimination against girl children.",
                reference_url="https://legislative.gov.in/sites/default/files/A2009-35.pdf"),
        ]
        db.add_all(legal)

    # ─── Counseling Resources ───────────────────────────────────────────────────
    if db.query(CounselingResource).count() == 0:
        counseling = [
            CounselingResource(title="iCall – TISS", category="mental_health", description="Professional psychological counselling services provided by trained counsellors and psychologists (TISS Mumbai).", contact="9152987821", website="https://icallhelpline.org", is_online=True),
            CounselingResource(title="Snehi Centre", category="trauma", description="Emotional support and crisis counselling for women and children.", contact="044-24640050", website="https://snehi.org", location="Pan India", is_online=True),
            CounselingResource(title="Majlis Legal Centre", category="legal_aid", description="Legal aid, counselling and advocacy for women who have faced violence.", contact="022-23700702", website="https://majlislaw.com", location="Mumbai"),
            CounselingResource(title="Sakhi One Stop Centre", category="shelter", description="One Stop Centre for women affected by violence — medical, legal, shelter, police, counselling.", contact="181", location="All Districts across India"),
            CounselingResource(title="Swadhar Greh Shelter", category="shelter", description="Shelter homes for women in difficult circumstances including trafficking victims.", contact="1800-180-5522", location="Pan India"),
            CounselingResource(title="CRY – Child Rights and You", category="mental_health", description="Support and advocacy for child rights, protection, and rehabilitation.", website="https://cry.org", contact="1800-103-7434", is_online=True),
            CounselingResource(title="Rainbow Homes", category="shelter", description="Safe shelter homes for homeless, street-connected and vulnerable children.", location="Multiple cities", website="https://rainbowhomes.in"),
            CounselingResource(title="Vandrevala Foundation", category="mental_health", description="24/7 mental health support — counselling, psychiatric consultation.", contact="1860-2662-345", website="https://vandrevalafoundation.com", is_online=True),
        ]
        db.add_all(counseling)

    # ─── Child Safety Tips ────────────────────────────────────────────────────────
    if db.query(ChildSafetyTip).count() == 0:
        tips = [
            ChildSafetyTip(title="Safe & Unsafe Touch", category="abuse_prevention", age_group="5-10",
                content="Teach children that their body belongs to them. Safe touch is a hug from a parent. Unsafe touch makes you feel uncomfortable. Always tell a trusted adult if someone touches you in a way that feels wrong."),
            ChildSafetyTip(title="The 5 Safety Rules", category="abuse_prevention", age_group="5-10",
                content="1. Say NO to uncomfortable touch. 2. Get away from the danger. 3. Tell a trusted adult. 4. Keep telling until someone helps. 5. It\'s never your fault."),
            ChildSafetyTip(title="Online Safety: Strangers", category="online_safety", age_group="11-14",
                content="Never share your real name, address, school, or photos with strangers online. Anyone asking for personal information or photos is not safe. Tell a parent or teacher immediately."),
            ChildSafetyTip(title="Cyberbullying: What to Do", category="online_safety", age_group="11-14",
                content="If someone is mean to you online: Don\'t respond. Save screenshots as evidence. Block the person. Tell a trusted adult. Report to the platform. Remember: you are not alone and it\'s not your fault."),
            ChildSafetyTip(title="Social Media Privacy", category="online_safety", age_group="15-18",
                content="Set your accounts to private. Never accept friend requests from strangers. Avoid posting your location in real time. Think before you post - what you share online stays online forever."),
            ChildSafetyTip(title="Recognizing Grooming", category="abuse_prevention", age_group="15-18",
                content="Grooming is when an adult tries to gain your trust to abuse you. Signs: excessive gifting, wanting to be alone with you, asking for secrets, making you feel special and isolated. Trust your instincts."),
            ChildSafetyTip(title="Your Rights as a Child", category="rights", age_group="11-14",
                content="Every child has rights: Right to education, Right to be protected from abuse, Right to privacy, Right to be heard. If your rights are violated, you can call CHILDLINE 1098 for free, 24/7."),
            ChildSafetyTip(title="What is Child Abuse?", category="abuse_prevention", age_group="parents",
                content="Child abuse includes physical abuse (hitting/burning), emotional abuse (constant criticism), sexual abuse (any sexual act), and neglect (not providing basic needs). All forms are harmful and illegal in India."),
            ChildSafetyTip(title="How to Report Child Abuse", category="abort_prevention", age_group="parents",
                content="If you suspect child abuse: Call CHILDLINE 1098 (free, 24/7). File an FIR at the nearest police station. Under POCSO Act, reporting is mandatory for ALL citizens. You can report anonymously."),
            ChildSafetyTip(title="Digital Safety for Children", category="online_safety", age_group="parents",
                content="Keep devices in common areas. Use parental controls. Regularly check browser history. Talk openly about online safety. Know your child\'s online friends. Teach them to come to you if something feels wrong."),
            ChildSafetyTip(title="Safe Internet Use at School", category="online_safety", age_group="teachers",
                content="Educate students about digital citizenship. Teach them to recognize scams and phishing. Encourage reporting of cyberbullying. Monitor class devices. Create a safe space for students to discuss online issues."),
        ]
        db.add_all(tips)

    # ─── Safe Places ───────────────────────────────────────────────────────────────
    if db.query(SafePlace).count() == 0:
        places = [
            # Delhi
            SafePlace(name="Delhi Police Women Help Desk", place_type="police_station", city="Delhi", address="Connaught Place, New Delhi", latitude=28.6327, longitude=77.2198, phone="1091", is_verified=True),
            SafePlace(name="AIIMS Hospital Delhi", place_type="hospital", city="Delhi", address="Sri Aurobindo Marg, New Delhi", latitude=28.5672, longitude=77.2100, phone="011-26588500", is_verified=True, website="https://aiims.edu"),
            SafePlace(name="Shakti Shalini Shelter", place_type="shelter", city="Delhi", address="Lajpat Nagar, New Delhi", latitude=28.5672, longitude=77.2444, phone="011-24373737", is_verified=True),
            SafePlace(name="Sakhi Women Resource Centre NGO", place_type="ngo", city="Delhi", address="Jangpura, New Delhi", latitude=28.5843, longitude=77.2488, phone="011-24313553", is_verified=True),
            # Mumbai
            SafePlace(name="Mumbai Women Police Station", place_type="police_station", city="Mumbai", address="Colaba, Mumbai, Maharashtra", latitude=18.9067, longitude=72.8147, phone="100", is_verified=True),
            SafePlace(name="KEM Hospital Mumbai", place_type="hospital", city="Mumbai", address="Parel, Mumbai, Maharashtra", latitude=19.0020, longitude=72.8422, phone="022-24107000", is_verified=True),
            SafePlace(name="Swadhar Shelter Mumbai", place_type="shelter", city="Mumbai", address="Dharavi, Mumbai, Maharashtra", latitude=19.0411, longitude=72.8559, phone="022-24071021", is_verified=True),
            SafePlace(name="Majlis Legal Centre", place_type="ngo", city="Mumbai", address="Vile Parle, Mumbai, Maharashtra", latitude=19.0990, longitude=72.8478, phone="022-23700702", is_verified=True),
            # Bangalore
            SafePlace(name="Bangalore City Police Women Cell", place_type="police_station", city="Bangalore", address="Brigade Road, Bengaluru", latitude=12.9716, longitude=77.6099, phone="080-22220000", is_verified=True),
            SafePlace(name="Victoria Hospital Bangalore", place_type="hospital", city="Bangalore", address="Krishnarajendra Market, Bengaluru", latitude=12.9716, longitude=77.5700, phone="080-26701150", is_verified=True),
            SafePlace(name="Parihar NGO Bangalore", place_type="ngo", city="Bangalore", address="Koramangala, Bengaluru", latitude=12.9352, longitude=77.6245, phone="080-25533105", is_verified=True),
            # Chennai
            SafePlace(name="Chennai Women Police Station", place_type="police_station", city="Chennai", address="Egmore, Chennai, Tamil Nadu", latitude=13.0827, longitude=80.2707, phone="044-28592750", is_verified=True),
            SafePlace(name="Government Rajaji Hospital Chennai", place_type="hospital", city="Chennai", address="Park Town, Chennai", latitude=13.0837, longitude=80.2786, phone="044-25305000", is_verified=True),
            SafePlace(name="Snehidi NGO Chennai", place_type="ngo", city="Chennai", address="T. Nagar, Chennai", latitude=13.0418, longitude=80.2341, phone="044-24340606", is_verified=True),
            # Kolkata
            SafePlace(name="Kolkata Women Police Station", place_type="police_station", city="Kolkata", address="Karaya, Kolkata, West Bengal", latitude=22.5726, longitude=88.3639, phone="033-23571001", is_verified=True),
            SafePlace(name="SSKM Hospital Kolkata", place_type="hospital", city="Kolkata", address="A.J.C. Bose Road, Kolkata", latitude=22.5394, longitude=88.3431, phone="033-22044228", is_verified=True),
            # Hyderabad
            SafePlace(name="Hyderabad SHE Teams Police", place_type="police_station", city="Hyderabad", address="Banjara Hills, Hyderabad", latitude=17.4126, longitude=78.4477, phone="100", is_verified=True),
            SafePlace(name="Gandhi Hospital Hyderabad", place_type="hospital", city="Hyderabad", address="Secunderabad, Hyderabad", latitude=17.4576, longitude=78.5010, phone="040-27505566", is_verified=True),
            SafePlace(name="Mahita NGO Hyderabad", place_type="ngo", city="Hyderabad", address="Himayatnagar, Hyderabad", latitude=17.3850, longitude=78.4867, phone="040-27660173", is_verified=True),
        ]
        db.add_all(places)

    # ─── Default Admin Account ─────────────────────────────────────────────────────
    if not db.query(User).filter(User.email == "admin@safeguard.in").first():
        admin = User(
            full_name="SafeGuard Admin",
            email="admin@safeguard.in",
            phone="9999999999",
            hashed_password=hash_password("Admin@1234"),
            role=UserRole.admin,
        )
        db.add(admin)

    db.commit()
    db.close()
    print("✅ Database seeded successfully.")


if __name__ == "__main__":
    seed()
