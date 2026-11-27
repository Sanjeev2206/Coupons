import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ankanwyqqaatpwizyiyo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Pm-d1pHB55S_sph_uMW-jg_qLvDFuLE";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const quizData = {
  coffee:{business:"Bean There Café",question:"Which ingredient gives a cappuccino its coffee flavour?",answers:["Tea leaves","Espresso coffee","Lemon juice","Cocoa butter"],correct:1,reward:"15% off your next coffee"},
  shopping:{business:"The Good Things Store",question:"Which of these is commonly used to wrap a gift?",answers:["Gift paper","Sand","Cooking oil","Soap"],correct:0,reward:"₹100 off purchases above ₹799"},
  beauty:{business:"Glow Studio",question:"Which of these is commonly used to moisturise skin?",answers:["Sand","Moisturiser","Chalk","Vinegar"],correct:1,reward:"20% off your first appointment"},
  cycle:{business:"Urban Cycle Care",question:"Which part of a bicycle helps it slow down or stop?",answers:["Bell","Brake","Seat","Basket"],correct:1,reward:"10% off your next service"}
};
const quizModal=document.getElementById("quizModal");
const infoModal=document.getElementById("infoModal");
const accountModal=document.getElementById("accountModal");
const businessGrid=document.getElementById("businessGrid");
const searchInput=document.getElementById("searchInput");
const emptyState=document.getElementById("emptyState");
const dashboard=document.getElementById("customerDashboard");
let currentSession=null;
let activeCategory="All",activeView="all",activeQuiz=null,selectedAnswer=null;

function renderCards(){
  let visible=0;
  document.querySelectorAll(".business-card").forEach(card=>{
    const categoryMatch=activeCategory==="All"||card.dataset.category===activeCategory;
    const viewMatch=activeView==="all"||card.dataset.view==="nearby";
    const term=searchInput.value.trim().toLowerCase();
    const searchMatch=!term||card.dataset.search.includes(term);
    const show=categoryMatch&&viewMatch&&searchMatch;
    card.hidden=!show;if(show)visible++;
  });
  emptyState.hidden=visible!==0;
}
document.getElementById("filters").addEventListener("click",e=>{
  const button=e.target.closest(".filter");if(!button)return;
  document.querySelectorAll(".filter").forEach(b=>b.classList.toggle("active",b===button));
  activeCategory=button.dataset.category;renderCards();
});
document.querySelectorAll(".tab").forEach(button=>button.addEventListener("click",()=>{
  activeView=button.dataset.view;
  document.querySelectorAll(".tab").forEach(b=>{const active=b===button;b.classList.toggle("active",active);b.setAttribute("aria-selected",String(active));});
  renderCards();
}));
searchInput.addEventListener("input",renderCards);
businessGrid.addEventListener("click",e=>{
  const button=e.target.closest(".quiz-trigger");if(!button)return;
  activeQuiz=quizData[button.dataset.quiz];selectedAnswer=null;
  document.getElementById("modalBusiness").textContent=activeQuiz.business;
  document.getElementById("quizQuestion").textContent=activeQuiz.question;
  document.getElementById("answerOptions").innerHTML=activeQuiz.answers.map((answer,index)=>'<label class="answer-option"><input type="radio" name="quizAnswer" value="'+index+'"><span>'+answer+'</span></label>').join("");
  document.getElementById("quizFeedback").textContent="";
  document.getElementById("quizFeedback").className="quiz-feedback";
  document.getElementById("submitAnswer").disabled=false;
  quizModal.showModal();
});
document.getElementById("answerOptions").addEventListener("change",e=>{if(e.target.name==="quizAnswer")selectedAnswer=Number(e.target.value)});
document.getElementById("submitAnswer").addEventListener("click",()=>{
  const feedback=document.getElementById("quizFeedback");
  if(selectedAnswer===null){feedback.textContent="Choose an answer first.";feedback.className="quiz-feedback error";return}
  if(selectedAnswer===activeQuiz.correct){
    feedback.textContent="Correct! This is a demo question only. Sign in and live business offers will be connected in the next stage.";
    feedback.className="quiz-feedback success";
    document.getElementById("submitAnswer").disabled=true;
  }else{
    feedback.textContent="Not quite. Please try again.";
    feedback.className="quiz-feedback error";
  }
});
document.getElementById("closeModal").addEventListener("click",()=>quizModal.close());

function showInfo(title,text){document.getElementById("infoTitle").textContent=title;document.getElementById("infoText").textContent=text;infoModal.showModal()}
document.getElementById("closeInfo").addEventListener("click",()=>infoModal.close());
document.getElementById("infoOk").addEventListener("click",()=>infoModal.close());

const accountForm=document.getElementById("accountForm");
const accountMode=document.getElementById("accountMode");
const accountRole=document.getElementById("accountRole");
const nameField=document.getElementById("nameField");
const businessFields=document.getElementById("businessFields");
const accountFeedback=document.getElementById("accountFeedback");
const accountSubmit=document.getElementById("accountSubmit");

function updateAccountForm(){
  const signup=accountMode.value==="signup";
  nameField.hidden=!signup;
  businessFields.hidden=accountRole.value!=="business";
  document.getElementById("accountHeading").textContent=signup?"Create your Coupons account":"Welcome back";
  document.getElementById("accountIntro").textContent=signup?"Create an account with your email. Mobile OTP will be configured separately.":"Sign in with the email and password you registered with.";
  document.getElementById("fullName").required=signup;
  document.getElementById("businessName").required=signup&&accountRole.value==="business";
  document.getElementById("businessCategory").required=signup&&accountRole.value==="business";
  document.getElementById("accountPassword").autocomplete=signup?"new-password":"current-password";
  accountSubmit.textContent=signup?"Create account":"Sign in";
  accountFeedback.textContent="";
}
accountMode.addEventListener("change",updateAccountForm);
accountRole.addEventListener("change",updateAccountForm);

function openAccount(role="customer"){
  accountRole.value=role;
  accountMode.value="signin";
  updateAccountForm();
  accountModal.showModal();
}
document.getElementById("customerLogin").addEventListener("click",()=>currentSession?showCustomerDashboard(currentSession):openAccount("customer"));
document.getElementById("businessLogin").addEventListener("click",()=>openAccount("business"));
document.getElementById("businessCta").addEventListener("click",()=>openAccount("business"));
document.getElementById("closeAccount").addEventListener("click",()=>accountModal.close());

document.getElementById("resendConfirmation").addEventListener("click",async()=>{
  const email=document.getElementById("accountEmail").value.trim();
  if(!email){accountFeedback.className="account-feedback error";accountFeedback.textContent="Enter your email address first.";return}
  const resendButton=document.getElementById("resendConfirmation");
  resendButton.disabled=true;
  accountFeedback.className="account-feedback";
  accountFeedback.textContent="Sending a fresh confirmation email…";
  try{
    const {error}=await supabase.auth.resend({
      type:"signup",
      email,
      options:{emailRedirectTo:"https://sanjeev2206.github.io/Coupons/"}
    });
    if(error)throw error;
    accountFeedback.className="account-feedback success";
    accountFeedback.textContent="A new confirmation email has been requested. Use only the newest email and ignore older confirmation links.";
  }catch(error){
    accountFeedback.className="account-feedback error";
    accountFeedback.textContent=error.message||"Could not resend the confirmation email. Check the email address and try again.";
  }finally{
    resendButton.disabled=false;
  }
});

accountForm.addEventListener("submit",async event=>{
  event.preventDefault();
  accountSubmit.disabled=true;
  accountFeedback.className="account-feedback";
  accountFeedback.textContent="Please wait…";
  const email=document.getElementById("accountEmail").value.trim();
  const password=document.getElementById("accountPassword").value;
  const signup=accountMode.value==="signup";
  const role=accountRole.value;
  try{
    let authResult;
    if(signup){
      authResult=await supabase.auth.signUp({
        email,password,
        options:{data:{full_name:document.getElementById("fullName").value.trim()},emailRedirectTo:"https://sanjeev2206.github.io/Coupons/"}
      });
    }else{
      authResult=await supabase.auth.signInWithPassword({email,password});
    }
    if(authResult.error)throw authResult.error;
    if(signup&&!authResult.data.session){
      accountFeedback.className="account-feedback success";
      accountFeedback.textContent="Account request received. Check your email for a confirmation link, then return here and sign in. For business registration, choose Business owner when signing in.";
      return;
    }
    if(role==="business"){
      const businessName=document.getElementById("businessName").value.trim();
      const businessCategory=document.getElementById("businessCategory").value;
      if(!businessName||!businessCategory){
        accountFeedback.className="account-feedback success";
        accountFeedback.textContent="You're signed in. To submit your business application, create an account as a business owner and complete the business details.";
        return;
      }
      const {data:businessId,error}=await supabase.rpc("register_business",{
        p_name:businessName,
        p_category:businessCategory,
        p_description:null,
        p_phone:document.getElementById("businessPhone").value.trim()||null,
        p_email:email,
        p_address:document.getElementById("businessAddress").value.trim()||null,
        p_city:document.getElementById("businessCity").value.trim()||null,
        p_state:null,p_postal_code:null,p_latitude:null,p_longitude:null
      });
      if(error)throw error;
      accountFeedback.className="account-feedback success";
      accountFeedback.textContent="Business application submitted. Application ID: "+businessId+". It will remain pending until approved by the platform administrator.";
    }else{
      accountFeedback.className="account-feedback success";
      accountFeedback.textContent=signup?"Your customer account has been created.":"You're signed in successfully.";
      if(authResult.data.session){currentSession=authResult.data.session;accountModal.close();await showCustomerDashboard(currentSession);}
    }
  }catch(error){
    accountFeedback.className="account-feedback error";
    accountFeedback.textContent=error.message||"Something went wrong. Please try again.";
  }finally{
    accountSubmit.disabled=false;
  }
});

document.getElementById("locationButton").addEventListener("click",()=>{
  const message=document.getElementById("locationMessage");
  if(!("geolocation" in navigator)){message.textContent="Your browser does not support location sharing. You can still browse all offers.";return}
  message.textContent="Nearby search will use your location after live business discovery is connected.";
});
document.getElementById("menuToggle").addEventListener("click",()=>document.querySelector(".main-nav").classList.toggle("open"));
document.querySelectorAll(".main-nav a").forEach(link=>link.addEventListener("click",()=>document.querySelector(".main-nav").classList.remove("open")));
renderCards();


async function showCustomerDashboard(session){
 if(!session)return; currentSession=session; dashboard.hidden=false;
 ["hero","trust-strip","discover-section","nearby-band","how-section","business-cta"].forEach(cls=>{const el=document.querySelector("."+cls);if(el)el.hidden=true;});
 document.getElementById("customerLogin").textContent="My account";
 document.getElementById("dashboardName").textContent=(session.user.user_metadata?.full_name||session.user.email?.split("@")[0]||"there").split(" ")[0];
 document.getElementById("profileEmail").value=session.user.email||"";
 await loadDashboardData(session);window.scrollTo({top:0,behavior:"smooth"});
}
function safeText(value){return String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");}
async function loadDashboardData(session){
 const list=document.getElementById("couponList");list.textContent="Loading your coupons…";
 const results=await Promise.all([supabase.from("profiles").select("full_name,phone,role").eq("id",session.user.id).maybeSingle(),supabase.from("coupons").select("id,code,reward_type,reward_value,minimum_purchase,issued_at,valid_until,status,businesses(name)").eq("customer_id",session.user.id).order("issued_at",{ascending:false})]);
 const pr=results[0],cr=results[1],feedback=document.getElementById("profileFeedback");
 if(pr.error)feedback.textContent="Profile could not load: "+pr.error.message;else{const p=pr.data||{};document.getElementById("profileName").value=p.full_name||session.user.user_metadata?.full_name||"";document.getElementById("profilePhone").value=p.phone||"";if(p.full_name)document.getElementById("dashboardName").textContent=p.full_name.split(" ")[0];}
 if(cr.error){list.textContent="Could not load coupons: "+cr.error.message;return;}
 const coupons=cr.data||[],now=Date.now(),active=coupons.filter(x=>x.status==="active"&&new Date(x.valid_until).getTime()>now),redeemed=coupons.filter(x=>x.status==="redeemed"),expired=coupons.filter(x=>x.status==="expired"||(x.status==="active"&&new Date(x.valid_until).getTime()<=now));
 document.getElementById("availableCount").textContent=active.length;document.getElementById("redeemedCount").textContent=redeemed.length;document.getElementById("expiredCount").textContent=expired.length;
 if(!coupons.length){list.innerHTML="<div class='coupon-empty'><h3>Your rewards will appear here</h3><p>You have not unlocked a coupon yet. Explore businesses and answer a question to earn your first reward.</p></div>";return;}
 list.innerHTML=coupons.map(x=>{const exp=x.status==="expired"||(x.status==="active"&&new Date(x.valid_until).getTime()<=now),status=exp?"Expired":x.status==="redeemed"?"Redeemed":x.status==="cancelled"?"Cancelled":"Available",reward=x.reward_type==="percentage"?Number(x.reward_value)+"% off":"₹"+Number(x.reward_value).toLocaleString("en-IN")+" off",business=x.businesses?.name||"Participating business";return "<article class='coupon-row'><div class='coupon-reward'><strong>"+safeText(reward)+"</strong><span>"+safeText(business)+"</span></div><div class='coupon-code'><span>COUPON CODE</span><strong>"+safeText(x.code)+"</strong></div><div class='coupon-meta'><span class='coupon-status "+(exp?"expired":x.status==="redeemed"?"redeemed":"available")+"'>"+status+"</span><span>Valid until "+new Date(x.valid_until).toLocaleDateString("en-IN")+"</span></div></article>";}).join("");
}
document.getElementById("refreshCoupons").addEventListener("click",()=>currentSession&&loadDashboardData(currentSession));
document.getElementById("profileForm").addEventListener("submit",async e=>{e.preventDefault();const b=document.getElementById("saveProfile"),f=document.getElementById("profileFeedback");b.disabled=true;f.textContent="Saving…";try{const {error}=await supabase.rpc("update_my_profile",{p_full_name:document.getElementById("profileName").value.trim()});if(error)throw error;document.getElementById("dashboardName").textContent=document.getElementById("profileName").value.trim().split(" ")[0]||"there";f.className="account-feedback success";f.textContent="Your name has been updated.";}catch(error){f.className="account-feedback error";f.textContent=error.message||"Could not update profile.";}finally{b.disabled=false;}});
document.getElementById("dashboardSignOut").addEventListener("click",async()=>{const {error}=await supabase.auth.signOut();if(error){alert(error.message);return;}currentSession=null;dashboard.hidden=true;["hero","trust-strip","discover-section","nearby-band","how-section","business-cta"].forEach(cls=>{const el=document.querySelector("."+cls);if(el)el.hidden=false;});document.getElementById("customerLogin").textContent="Sign in";window.scrollTo({top:0,behavior:"smooth"});});
document.getElementById("dashboardDiscover").addEventListener("click",()=>{dashboard.hidden=true;["hero","trust-strip","discover-section","nearby-band","how-section","business-cta"].forEach(cls=>{const el=document.querySelector("."+cls);if(el)el.hidden=false;});});
const {data:{session}}=await supabase.auth.getSession();if(session)await showCustomerDashboard(session);
supabase.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_OUT"){currentSession=null;dashboard.hidden=true;["hero","trust-strip","discover-section","nearby-band","how-section","business-cta"].forEach(cls=>{const el=document.querySelector("."+cls);if(el)el.hidden=false;});document.getElementById("customerLogin").textContent="Sign in";}});

