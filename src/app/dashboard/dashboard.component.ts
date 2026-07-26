import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseX: number;
  baseY: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class Dashboard implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('particleCanvas') particleCanvas!: ElementRef<HTMLCanvasElement>;

  userId: string | null = null;
  userData: any = {
    nameEn: '',
    nameAr: '',
    titleEn: '',
    titleAr: '',
    companyEn: '',
    companyAr: '',
    aboutEn: '',
    aboutAr: '',
    locationEn: '',
    locationAr: '',
    email: '',
    phone: '',
    website: '',
    linkedIn: '',
    whatsApp: '',
    profilePhoto: '',
    backgroundPhoto: '',
    skills: [],
    experiences: [],
    educations: []
  };

  activeTab: 'basic' | 'contact' | 'social' | 'skills' | 'experience' | 'education' = 'basic';
  currentLang: 'en' | 'ar' = 'en';

  newSkill: string = '';
  newExp = { titleEn: '', titleAr: '', companyEn: '', companyAr: '' };
  newEdu = { degreeEn: '', degreeAr: '', fieldEn: '', fieldAr: '' };

  isLoading: boolean = true;
  isSaving: boolean = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  showPreviewModal: boolean = false;
  showCardBackSide: boolean = false;

  // Edit Image Modal variables
  showEditImageModal: boolean = false;
  originalImageSrc: string = '';
  zoomValue: number = 1;
  dragOffset = { x: 0, y: 0 };
  private isDraggingImage: boolean = false;
  private startDragPos = { x: 0, y: 0 };
  currentUploadType: 'avatar' | 'background' = 'avatar';

  private readonly getApiUrl = `${environment.apiUrl}/Profile/user/`;
  private readonly updateApiUrl = `${environment.apiUrl}/Profile/UpdateMyProfile`;

  private ctx: CanvasRenderingContext2D | null = null;
  private animId: number = 0;
  private particles: Particle[] = [];
  private mouse = { x: -1000, y: -1000, radius: 180 };

  translations = {
    en: {
      brand: 'Dashboard',
      save: 'Save Changes',
      saving: 'Saving...',
      logout: 'Logout',
      basicTab: 'Basic Info',
      contactTab: 'Contact Info',
      socialTab: 'Social Links',
      skillsTab: 'Skills',
      expTab: 'Experience',
      eduTab: 'Education',
      photoBgHeader: 'PROFILE PHOTO & BACKGROUND',
      changeBgBtn: 'Change Background',
      noBgText: 'No background image',
      changePhotoBtn: 'Change Profile Photo',
      nameEnLabel: 'NAME (ENGLISH)',
      nameArLabel: 'NAME (ARABIC)',
      titleEnLabel: 'TITLE (ENGLISH)',
      titleArLabel: 'TITLE (ARABIC)',
      companyEnLabel: 'COMPANY (ENGLISH)',
      companyArLabel: 'COMPANY (ARABIC)',
      aboutEnLabel: 'ABOUT (ENGLISH)',
      aboutArLabel: 'ABOUT (ARABIC)',
      locationEnLabel: 'LOCATION (ENGLISH)',
      locationArLabel: 'LOCATION (ARABIC)',
      emailLabel: 'EMAIL ADDRESS',
      phoneLabel: 'PHONE NUMBER',
      websiteLabel: 'WEBSITE URL',
      linkedInLabel: 'LINKEDIN URL',
      whatsAppLabel: 'WHATSAPP NUMBER',
      addSkillBtn: 'Add Skill',
      addExpBtn: 'Add Experience',
      addEduBtn: 'Add Education',
      saveSuccessMsg: 'Profile changes saved successfully!',
      aboutMe: 'About Me',
      skills: 'Skills',
      experience: 'Experience',
      education: 'Education',
      scanText: 'SCAN TO VIEW MY DIGITAL CARD',
      saveContact: 'Save Contact'
    },
    ar: {
      brand: 'لوحة التحكم',
      save: 'حفظ التغيرات',
      saving: 'جاري الحفظ...',
      logout: 'تسجيل خروج',
      basicTab: 'البيانات الأساسية',
      contactTab: 'معلومات التواصل',
      socialTab: 'روابط التواصل',
      skillsTab: 'المهارات',
      expTab: 'الخبرات',
      eduTab: 'التعليم',
      photoBgHeader: 'الصورة الشخصية والغلاف',
      changeBgBtn: 'تغيير الغلاف',
      noBgText: 'لا توجد صورة غلاف',
      changePhotoBtn: 'تغيير الصورة الشخصية',
      nameEnLabel: 'الاسم (بالإنجليزية)',
      nameArLabel: 'الاسم (بالعربية)',
      titleEnLabel: 'المسمى الوظيفي (إنجليزية)',
      titleArLabel: 'المسمى الوظيفي (عربية)',
      companyEnLabel: 'الشركة (بالإنجليزية)',
      companyArLabel: 'الشركة (بالعربية)',
      aboutEnLabel: 'نبذة عني (إنجليزية)',
      aboutArLabel: 'نبذة عني (عربية)',
      locationEnLabel: 'الموقع (إنجليزية)',
      locationArLabel: 'الموقع (عربية)',
      emailLabel: 'البريد الإلكتروني',
      phoneLabel: 'رقم الهاتف',
      websiteLabel: 'رابط الموقع الإلكتروني',
      linkedInLabel: 'رابط لينكد إن LinkedIn',
      whatsAppLabel: 'رابط واتساب WhatsApp',
      addSkillBtn: 'إضافة مهارة',
      addExpBtn: 'إضافة خبرة',
      addEduBtn: 'إضافة مؤهل تعليمي',
      saveSuccessMsg: 'تم حفظ وتحديث التغييرات بنجاح!',
      aboutMe: 'نبذة عني',
      skills: 'المهارات',
      experience: 'الخبرة المهنية',
      education: 'التعليم',
      scanText: 'امسح الكود لعرض كرتي الرقمي',
      saveContact: 'حفظ جهة الاتصال'
    }
  };

  constructor(
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  get t() {
    return this.translations[this.currentLang];
  }

  get dir() {
    return this.currentLang === 'ar' ? 'rtl' : 'ltr';
  }

  get userDisplayName(): string {
    const name =
      this.userData?.nameEn ||
      this.userData?.NameEn ||
      this.userData?.nameAr ||
      this.userData?.NameAr ||
      this.userData?.username ||
      this.userData?.Username ||
      this.userData?.email ||
      this.userData?.Email;

    return name || 'Wael Al-Habbal';
  }

  get userJobTitle(): string {
    return (
      this.userData?.titleEn ||
      this.userData?.TitleEn ||
      this.userData?.titleAr ||
      this.userData?.TitleAr ||
      ''
    );
  }

  get userCompany(): string {
    return (
      this.userData?.companyEn ||
      this.userData?.CompanyEn ||
      this.userData?.companyAr ||
      this.userData?.CompanyAr ||
      ''
    );
  }

  get userEmail(): string {
    return this.userData?.email || this.userData?.Email || '';
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      const savedUserStr = localStorage.getItem('user');
      if (savedUserStr) {
        try {
          const parsed = JSON.parse(savedUserStr);
          this.userData = { ...this.userData, ...parsed };
          this.isLoading = false;
        } catch (e) {
          console.error(e);
        }
      }

      this.userId = localStorage.getItem('userId') || this.userData?.id || this.userData?.userId || this.userData?.Id;

      if (this.userId) {
        this.fetchUserData(this.userId);
      } else {
        this.isLoading = false;
      }
    } else {
      this.isLoading = false;
    }
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.initCanvas(), 50);
    }
  }

  ngOnDestroy() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
    }
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('mousemove', this.onGlobalMouseMove);
      window.removeEventListener('mouseleave', this.onGlobalMouseLeave);
      window.removeEventListener('resize', this.resizeCanvas);
    }
  }

  toggleLanguage() {
    this.currentLang = this.currentLang === 'en' ? 'ar' : 'en';
    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.setAttribute('dir', this.currentLang === 'ar' ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', this.currentLang);
    }
  }

  togglePreviewModal() {
    this.showPreviewModal = !this.showPreviewModal;
    if (this.showPreviewModal) {
      this.showCardBackSide = false;
    }
  }

  toggleCardSide(): void {
    this.showCardBackSide = !this.showCardBackSide;
    this.cdr.detectChanges();
  }

  getQrCodeUrl(user: any): string {
    if (!user || !user.id) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://fahd1.runasp.net';
    const cardUrl = `${origin}/user/${user.id}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=1d8cf8&bgcolor=090d16&data=${encodeURIComponent(cardUrl)}`;
  }

  downloadVCard(user: any, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!user) return;
    const vcardData = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${user.nameEn || user.username || ''}`,
      `ORG:${user.companyEn || ''}`,
      `TITLE:${user.titleEn || ''}`,
      `TEL;TYPE=CELL:${user.phone || ''}`,
      `EMAIL;TYPE=PREF,INTERNET:${user.email || ''}`,
      `URL:${user.website || ''}`,
      `ADR;TYPE=WORK:;;${user.locationEn || ''};;;;`,
      'END:VCARD'
    ].join('\n');

    const blob = new Blob([vcardData], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${user.nameEn || 'contact'}.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  shareCard(user: any, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!user) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://fahd1.runasp.net';
    const shareUrl = `${origin}/user/${user.id}`;

    if (navigator.share) {
      navigator.share({
        title: user.nameEn || 'Digital Card',
        text: `View digital card of ${user.nameEn || ''}`,
        url: shareUrl
      }).catch(err => console.log('Share error', err));
    } else {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl).then(() => {
          alert(this.currentLang === 'ar' ? 'تم نسخ رابط المشاركة للحافظة!' : 'Share link copied to clipboard!');
        });
      }
    }
  }

  setTab(tab: 'basic' | 'contact' | 'social' | 'skills' | 'experience' | 'education') {
    this.activeTab = tab;
  }

  fetchUserData(id: string) {
    this.http.get<any>(`${this.getApiUrl}${id}`).subscribe({
      next: (data) => {
        this.isLoading = false;
        if (data) {
          this.userData = { ...this.userData, ...data };
          localStorage.setItem('user', JSON.stringify(this.userData));
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error fetching dashboard user:', err);
      }
    });
  }

  onFileSelected(event: any, type: 'avatar' | 'background') {
    const file: File = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.originalImageSrc = e.target.result;
        this.zoomValue = 1;
        this.dragOffset = { x: 0, y: 0 };
        this.currentUploadType = type;
        this.showEditImageModal = true;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
      event.target.value = '';
    }
  }

  closeEditModal() {
    this.showEditImageModal = false;
    this.originalImageSrc = '';
  }

  startDrag(event: MouseEvent | TouchEvent) {
    this.isDraggingImage = true;
    const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
    const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;
    this.startDragPos = {
      x: clientX - this.dragOffset.x,
      y: clientY - this.dragOffset.y
    };
  }

  dragImage(event: MouseEvent | TouchEvent) {
    if (!this.isDraggingImage) return;
    const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
    const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;
    this.dragOffset = {
      x: clientX - this.startDragPos.x,
      y: clientY - this.startDragPos.y
    };
  }

  endDrag() {
    this.isDraggingImage = false;
  }

  applyCropAndUpload() {
    const type = this.currentUploadType;
    const img = new Image();
    img.src = this.originalImageSrc;
    img.onload = () => {
      const isAvatar = type === 'avatar';
      const canvasWidth = isAvatar ? 400 : 600;
      const canvasHeight = isAvatar ? 400 : 340;

      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        const imgRatio = img.width / img.height;
        let drawWidth = 320;
        let drawHeight = 320;

        if (imgRatio > 1) {
          drawWidth = 320 * imgRatio;
        } else {
          drawHeight = 320 / imgRatio;
        }

        ctx.save();
        ctx.translate(canvasWidth / 2, canvasHeight / 2);
        
        // Dynamic scale depending on type
        const cropMultiplier = isAvatar ? (400 / 240) : (600 / 280);
        const scale = this.zoomValue * cropMultiplier;
        ctx.scale(scale, scale);
        
        // Translate drag offset
        ctx.translate(this.dragOffset.x * (240 / 320), this.dragOffset.y * (240 / 320));

        ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        ctx.restore();

        canvas.toBlob((blob) => {
          if (blob) {
            // Local preview instantly
            const localUrl = URL.createObjectURL(blob);
            if (type === 'avatar') {
              this.userData.profilePhoto = localUrl;
            } else {
              this.userData.backgroundPhoto = localUrl;
            }

            // Close modal immediately
            this.showEditImageModal = false;
            this.cdr.detectChanges();

            // Upload in background
            this.uploadCroppedFile(blob, type);
          }
        }, 'image/jpeg', 0.95);
      }
    };
  }

  uploadCroppedFile(blob: Blob, type: 'avatar' | 'background') {
    const formData = new FormData();
    formData.append('file', blob, 'cropped_image.jpg');

    this.isSaving = true;
    this.errorMessage = null;
    this.successMessage = null;

    const uploadUrl = `${environment.apiUrl}/ImageUploader`;

    this.http.post<any>(uploadUrl, formData).subscribe({
      next: (res) => {
        this.isSaving = false;
        if (res && res.url) {
          if (type === 'avatar') {
            this.userData.profilePhoto = res.url;
          } else {
            this.userData.backgroundPhoto = res.url;
          }
          this.successMessage = this.currentLang === 'ar' ? 'تم رفع وحفظ الصورة بنجاح!' : 'Image uploaded and saved!';
          this.saveProfile();
        }
      },
      error: (err) => {
        this.isSaving = false;
        console.error('File upload error:', err);
        this.errorMessage = this.currentLang === 'ar' 
          ? 'فشل رفع الصورة على السيرفر! يرجى التحقق من اتصال السيرفر.' 
          : 'Image upload to server failed! Please check connection.';
      }
    });
  }

  addSkill() {
    if (this.newSkill.trim()) {
      if (!this.userData.skills) this.userData.skills = [];
      this.userData.skills.push(this.newSkill.trim());
      this.newSkill = '';
    }
  }

  removeSkill(index: number) {
    if (this.userData.skills) {
      this.userData.skills.splice(index, 1);
    }
  }

  addExperience() {
    if (this.newExp.titleEn || this.newExp.titleAr || this.newExp.companyEn) {
      if (!this.userData.experiences) this.userData.experiences = [];
      this.userData.experiences.push({ ...this.newExp });
      this.newExp = { titleEn: '', titleAr: '', companyEn: '', companyAr: '' };
    }
  }

  removeExperience(index: number) {
    if (this.userData.experiences) {
      this.userData.experiences.splice(index, 1);
    }
  }

  addEducation() {
    if (this.newEdu.degreeEn || this.newEdu.degreeAr || this.newEdu.fieldEn) {
      if (!this.userData.educations) this.userData.educations = [];
      this.userData.educations.push({ ...this.newEdu });
      this.newEdu = { degreeEn: '', degreeAr: '', fieldEn: '', fieldAr: '' };
    }
  }

  removeEducation(index: number) {
    if (this.userData.educations) {
      this.userData.educations.splice(index, 1);
    }
  }

  saveProfile() {
    this.isSaving = true;
    this.errorMessage = null;
    this.successMessage = null;

    const token = isPlatformBrowser(this.platformId) ? localStorage.getItem('token') : null;
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    this.http.put<any>(this.updateApiUrl, this.userData, { headers }).subscribe({
      next: (res) => {
        this.isSaving = false;
        this.successMessage = this.t.saveSuccessMsg;
        if (res.profile) {
          this.userData = { ...this.userData, ...res.profile };
        }
        localStorage.setItem('user', JSON.stringify(this.userData));
      },
      error: (err) => {
        this.isSaving = false;
        console.error('Save error:', err);
        this.errorMessage = this.currentLang === 'ar' 
          ? 'فشل حفظ وتحديث التغييرات! يرجى التأكد من اتصال السيرفر.' 
          : 'Failed to save changes! Please check server connection.';
      }
    });
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('user');
    }
    this.router.navigate(['/login']);
  }

  private onGlobalMouseMove = (event: MouseEvent) => {
    this.mouse.x = event.clientX;
    this.mouse.y = event.clientY;
  };

  private onGlobalMouseLeave = () => {
    this.mouse.x = -1000;
    this.mouse.y = -1000;
  };

  private initCanvas() {
    if (!this.particleCanvas) return;
    const canvas = this.particleCanvas.nativeElement;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;

    this.resizeCanvas();

    window.addEventListener('mousemove', this.onGlobalMouseMove);
    window.addEventListener('mouseleave', this.onGlobalMouseLeave);
    window.addEventListener('resize', this.resizeCanvas);

    const count = Math.min(95, Math.floor((canvas.width * canvas.height) / 12000));
    this.particles = [];
    for (let i = 0; i < count; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      this.particles.push({
        x,
        y,
        baseX: x,
        baseY: y,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: Math.random() * 2.2 + 1.2
      });
    }

    this.animate();
  }

  private resizeCanvas = () => {
    if (!this.particleCanvas || !isPlatformBrowser(this.platformId)) return;
    const canvas = this.particleCanvas.nativeElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  private animate = () => {
    if (!this.ctx || !this.particleCanvas || !isPlatformBrowser(this.platformId)) return;
    const canvas = this.particleCanvas.nativeElement;
    const width = canvas.width;
    const height = canvas.height;

    this.ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      const dx = this.mouse.x - p.x;
      const dy = this.mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.mouse.radius && dist > 0) {
        const force = (this.mouse.radius - dist) / this.mouse.radius;
        const pushX = (dx / dist) * force * 4.5;
        const pushY = (dy / dist) * force * 4.5;
        p.x -= pushX;
        p.y -= pushY;
      }

      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) { p.x = 0; p.vx *= -1; }
      if (p.x > width) { p.x = width; p.vx *= -1; }
      if (p.y < 0) { p.y = 0; p.vy *= -1; }
      if (p.y > height) { p.y = height; p.vy *= -1; }

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(96, 165, 250, 0.85)';
      this.ctx.fill();

      if (dist < 170) {
        const mouseOpacity = (1 - dist / 170) * 0.45;
        this.ctx.beginPath();
        this.ctx.moveTo(p.x, p.y);
        this.ctx.lineTo(this.mouse.x, this.mouse.y);
        this.ctx.strokeStyle = `rgba(59, 130, 246, ${mouseOpacity})`;
        this.ctx.lineWidth = 1.2;
        this.ctx.stroke();
      }

      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const distance = Math.hypot(p.x - p2.x, p.y - p2.y);

        if (distance < 145) {
          const lineOpacity = (1 - distance / 145) * 0.28;
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.strokeStyle = `rgba(59, 130, 246, ${lineOpacity})`;
          this.ctx.lineWidth = 0.9;
          this.ctx.stroke();
        }
      }
    }

    this.animId = requestAnimationFrame(this.animate);
  };
}
